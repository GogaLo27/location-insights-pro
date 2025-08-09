// /supabase/functions/paypal-create-subscription/index.ts
// Deno Deploy / Supabase Edge Function (no login to PayPal required)
// Creates a PayPal vault setup token, exchanges to a payment token, and creates a subscription.
// Also supports redirect fallback if you ever want it, but we use card-only flow here.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Json = Record<string, any>;

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE") || "https://api-m.paypal.com"; // use https://api-m.sandbox.paypal.com for sandbox
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("PAYPAL_SECRET")!;
const WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID") || "";

// Map your UI plan types to PayPal Billing Plan IDs (format P-XXXXXXXX).
// IMPORTANT: set these secrets in Supabase: PAYPAL_PLAN_STARTER, PAYPAL_PLAN_PROFESSIONAL, PAYPAL_PLAN_ENTERPRISE
const PLAN_MAP: Record<string, string | undefined> = {
  starter: Deno.env.get("PAYPAL_PLAN_STARTER"),
  professional: Deno.env.get("PAYPAL_PLAN_PROFESSIONAL"),
  enterprise: Deno.env.get("PAYPAL_PLAN_ENTERPRISE"),
};

function j(status: number, body: Json) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal OAuth failed: ${res.status} ${t}`);
  }
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return j(405, { error: "Method not allowed" });

  let body: Json = {};
  try {
    body = await req.json();
  } catch {
    return j(400, { error: "Invalid JSON" });
  }

  const { action, plan_type, plan_id: rawPlanId, vault_setup_token, payment_source_token, return_url, cancel_url } = body as {
    action?: "create_vault_setup_token" | "exchange_setup_token" | "create_subscription_with_token" | "create_subscription_redirect";
    plan_type?: "starter" | "professional" | "enterprise";
    plan_id?: string;                 // optional override (must be a valid PayPal Plan ID)
    vault_setup_token?: string;       // returned by the Card Fields JS SDK
    payment_source_token?: string;    // token returned by exchange step
    return_url?: string;              // only used for redirect flow fallback
    cancel_url?: string;              // only used for redirect flow fallback
  };

  try {
    const accessToken = await getAccessToken();

    // Step A: create a vault setup token (JS SDK usually does this on the client, but exposing here if you want server-side)
    if (action === "create_vault_setup_token") {
      const res = await fetch(`${PAYPAL_BASE}/v1/vault/setup-tokens`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ payment_source: { card: {} }, usage_pattern: "ONETIME", usage_type: "MERCHANT" }),
      });
      const data = await res.json();
      if (!res.ok) return j(res.status, { error: "setup_token_failed", details: data });
      return j(200, { vault_setup_token: data.id });
    }

    // Step B: exchange vault setup token for a vaulted payment method token
    if (action === "exchange_setup_token") {
      if (!vault_setup_token) return j(400, { error: "missing_vault_setup_token" });
      const res = await fetch(`${PAYPAL_BASE}/v1/vault/verify/setup-tokens/${vault_setup_token}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) return j(res.status, { error: "exchange_failed", details: data });
      // data.payment_source.card.id is the vaulted token
      const vaulted = data?.payment_source?.card?.id;
      if (!vaulted) return j(500, { error: "no_payment_token_in_response", details: data });
      return j(200, { payment_source_token: vaulted });
    }

    // Resolve plan id (allow explicit plan_id override, else map by plan_type)
    const isValidPlanId = (s?: string) => !!s && /^P-[A-Z0-9]+$/i.test(s);
    const planId = isValidPlanId(rawPlanId) ? rawPlanId : PLAN_MAP[plan_type || ""] || "";

    // Step C: create subscription using vaulted payment source (card-only, no PayPal login)
    if (action === "create_subscription_with_token") {
      if (!planId) {
        return j(400, { error: `Unknown plan_type "${plan_type}". Set PAYPAL_PLAN_${String(plan_type).toUpperCase()} in Supabase secrets or pass a valid plan_id.` });
      }
      if (!payment_source_token) return j(400, { error: "missing_payment_source_token" });

      const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          application_context: { user_action: "SUBSCRIBE_NOW" },
          payment_source: { token: { id: payment_source_token, type: "PAYMENT_METHOD_TOKEN" } },
        }),
      });
      const data = await res.json();
      if (!res.ok) return j(res.status, { error: "subscription_create_failed", details: data });

      // Return IDs so frontend can store pendingSubId, etc.
      return j(200, {
        subscription_id: data.id,
        status: data.status,
      });
    }

    // Optional: redirect flow (if you ever toggle back)
    if (action === "create_subscription_redirect") {
      if (!planId) {
        return j(400, { error: `Unknown plan_type "${plan_type}". Set PAYPAL_PLAN_${String(plan_type).toUpperCase()} in Supabase secrets or pass a valid plan_id.` });
      }
      const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          application_context: {
            brand_name: "Location Insights Pro",
            user_action: "SUBSCRIBE_NOW",
            return_url,
            cancel_url,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) return j(res.status, { error: "subscription_create_failed", details: data });
      const approval = (data.links || []).find((l: any) => l.rel === "approve")?.href;
      return j(200, { subscription_id: data.id, approval_url: approval });
    }

    return j(400, { error: "Unknown action" });
  } catch (e: any) {
    return j(500, { error: "server_error", message: e?.message || String(e) });
  }
});
