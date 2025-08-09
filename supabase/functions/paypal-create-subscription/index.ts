// supabase/functions/paypal-create-subscription/index.ts
// Redirect/approval flow (PayPal hosted page) with CORS.
// Returns approval_url so the frontend can redirect the user to PayPal.
// Guests can pay by card on PayPal without logging in (if Guest Checkout is enabled on your account).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET")!;
const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE") || "https://api-m.sandbox.paypal.com";

// Map your plan slugs to PayPal PLAN IDs (configure via secrets)
const PLAN_MAP: Record<string, string> = {
  starter: Deno.env.get("PAYPAL_PLAN_STARTER") ?? "",
  professional: Deno.env.get("PAYPAL_PLAN_PRO") ?? "",
  enterprise: Deno.env.get("PAYPAL_PLAN_ENTERPRISE") ?? "",
};

function j(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

async function getAccessToken() {
  const creds = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`);
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const txt = await r.text();
  if (!r.ok) throw new Error(`PayPal oauth failed: ${r.status} ${txt}`);
  const data = txt ? JSON.parse(txt) : {};
  return data.access_token as string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j(405, { error: "Method not allowed" });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const body = (await req.json().catch(() => ({}))) as {
      plan_type?: string;
      return_url?: string;
      cancel_url?: string;
    };

    const planType = String(body.plan_type || "");
    const planId = PLAN_MAP[planType];
    if (!planId) return j(400, { error: `Unknown plan_type ${planType}` });

    const returnUrl = body.return_url || `${new URL(req.url).origin}/billing/success`;
    const cancelUrl = body.cancel_url || `${new URL(req.url).origin}/billing/cancel`;

    const {
      data: { user },
    } = await sb.auth.getUser().catch(() => ({ data: { user: null } }));

    const access = await getAccessToken();

    // Create subscription to get an approval link
    const subPayload = {
      plan_id: planId,
      application_context: {
        // shown on the hosted approval page
        brand_name: "Location Insights Pro",
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    };

    const subRes = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify(subPayload),
    });

    const subTxt = await subRes.text();
    if (!subRes.ok) {
      console.error("PayPal create subscription failed", subRes.status, subTxt);
      return j(502, { error: "PayPal create subscription failed", details: subTxt });
    }
    const sub = subTxt ? JSON.parse(subTxt) : {};

    // Extract approval link
    const approvalUrl: string | undefined = Array.isArray(sub?.links)
      ? sub.links.find((l: any) => l?.rel === "approve")?.href
      : undefined;

    if (!approvalUrl) {
      return j(500, { error: "No approval link returned from PayPal", raw: sub });
    }

    // Optional: create a local row so your UI (BillingSuccess) can poll
    let localId: string | null = null;
    try {
      const { data, error } = await sb
        .from("subscriptions")
        .insert({
          user_id: user?.id ?? null,
          plan_type: planType,
          status: "pending",
          provider_subscription_id: sub?.id ?? null,
        })
        .select("id")
        .single();
      if (!error) localId = data?.id ?? null;
    } catch (e) {
      console.error("DB insert error", e);
    }

    return j(200, {
      approval_url: approvalUrl,
      provider_subscription_id: sub?.id ?? null,
      subscription_id: localId, // your local DB id (optional)
    });
  } catch (e: any) {
    console.error("handler error", e?.message || e);
    return j(500, { error: e?.message || "Server error" });
  }
});
