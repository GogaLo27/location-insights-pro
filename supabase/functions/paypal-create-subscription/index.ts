// supabase/functions/paypal-create-subscription/index.ts
// Deno Edge Function with strict CORS + card-only subscription actions
// Actions:
//  - create_setup_token
//  - exchange_setup_token
//  - create_subscription_with_token

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Json = Record<string, any>;

const corsHeaders = {
  // allow your preview and localhost; "*" also works because we don't use cookies
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET")!;
const PAYPAL_BASE =
  Deno.env.get("PAYPAL_BASE") || "https://api-m.sandbox.paypal.com"; // switch to live later

// Map your app plan slugs -> PayPal plan IDs
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

async function getPPAccessToken() {
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
  if (!r.ok) {
    console.error("oauth fail", r.status, txt);
    throw new Error("PayPal oauth failed");
  }
  const data = txt ? JSON.parse(txt) : {};
  return data.access_token as string;
}

async function pp(path: string, method: string, token: string, body?: Json) {
  const r = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "PayPal-Request-Id": crypto.randomUUID(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  const data = txt ? (() => { try { return JSON.parse(txt); } catch { return txt; } })() : null;
  if (!r.ok) {
    console.error("PayPal error", method, path, r.status, data);
    throw new Error(`PayPal ${method} ${path} failed`);
  }
  return data;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const body = (await req.json().catch(() => ({}))) as Json;
    const action = String(body.action || "");

    const {
      data: { user },
    } = await sb.auth.getUser().catch(() => ({ data: { user: null } }));

    const access = await getPPAccessToken();

    // 1) Setup token (empty card) – Card Fields will update it client-side on submit
    if (action === "create_setup_token") {
      const payload = {
        payment_source: { card: {} },
        attributes: { vault: { store_in_vault: "ON_SUCCESS" } },
        customer: user ? { id: user.id } : undefined,
      };
      const res = await pp("/v3/vault/setup-tokens", "POST", access, payload);
      return j(200, { setup_token: res?.id });
    }

    // 2) Exchange setup token -> permanent payment token (vault)
    if (action === "exchange_setup_token") {
      const setup_token = String(body.setup_token || "");
      if (!setup_token) return j(400, { error: "Missing setup_token" });

      const payload = {
        customer: user ? { id: user.id } : undefined,
        payment_source: { card: { vault_setup_token: setup_token } },
      };
      const res = await pp("/v3/vault/payment-tokens", "POST", access, payload);
      return j(200, { payment_token: res?.id });
    }

    // 3) Create the subscription with the vaulted token (card-only, no redirect)
    if (action === "create_subscription_with_token") {
      const plan_type = String(body.plan_type || "");
      const tokenId = String(body.payment_token || "");
      const plan_id = PLAN_MAP[plan_type];
      if (!plan_id) return j(400, { error: `Unknown plan_type ${plan_type}` });
      if (!tokenId) return j(400, { error: "Missing payment_token" });

      const subPayload = {
        plan_id,
        subscriber: {
          payment_source: {
            token: { id: tokenId, type: "PAYMENT_METHOD_TOKEN" },
          },
        },
      };

      const sub = await pp("/v1/billing/subscriptions", "POST", access, subPayload);

      // store minimal local row for your success page polling
      const { data: row, error } = await sb
        .from("subscriptions")
        .insert({
          user_id: user?.id ?? null,
          plan_type,
          status: (sub?.status || "PENDING").toLowerCase(),
          provider_subscription_id: sub?.id || null,
        })
        .select("id")
        .single();

      if (error) console.error("DB insert error", error);

      return j(200, {
        subscription_id: row?.id ?? null,
        provider_subscription_id: sub?.id ?? null,
        status: sub?.status ?? null,
      });
    }

    // If your frontend still calls the old redirect mode by mistake, fail clearly (with CORS)
    return j(400, { error: "Unknown action. Expected one of: create_setup_token, exchange_setup_token, create_subscription_with_token" });
  } catch (e: any) {
    console.error("handler error", e?.message || e);
    return j(500, { error: e?.message || "Server error" });
  }
});
