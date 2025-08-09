// Deno/Supabase Edge Function
// Modes supported (in a single endpoint):
//  - action: "get_config" → returns { clientId, environment }
//  - action: "create_setup_token" → returns { id: <vault_setup_token> }
//  - action: "create_subscription_with_vault" → body: { plan_type, vault_setup_token } → creates payment token + subscription (card-only, no PayPal login)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ——— ENV ———
// Set these with: npx supabase secrets set KEY=VALUE
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PAYPAL_ENV: "sandbox" | "live" = (Deno.env.get("PAYPAL_ENV") as any) || "sandbox";
const PAYPAL_BASE = PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET")!;

const PLAN_STARTER = Deno.env.get("PAYPAL_PLAN_ID_STARTER")!;
const PLAN_PRO = Deno.env.get("PAYPAL_PLAN_ID_PROFESSIONAL")!;
const PLAN_ENT = Deno.env.get("PAYPAL_PLAN_ID_ENTERPRISE")!;

const PLAN_MAP: Record<string, string> = {
  starter: PLAN_STARTER,
  professional: PLAN_PRO,
  enterprise: PLAN_ENT,
};

// ——— helpers ———
async function getAccessToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`PayPal oauth failed: ${res.status} ${t}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

async function createSetupToken(accessToken: string) {
  const res = await fetch(`${PAYPAL_BASE}/v3/vault/setup-tokens`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `${Date.now()}-setup`,
    },
    body: JSON.stringify({
      payment_source: { card: {} }, // per PayPal docs: empty card; SDK updates it
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`setup-token failed: ${res.status} ${body}`);
  return JSON.parse(body);
}

async function createPaymentTokenFromSetup(accessToken: string, setupToken: string) {
  const res = await fetch(`${PAYPAL_BASE}/v3/vault/payment-tokens`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `${Date.now()}-ptok`,
    },
    body: JSON.stringify({
      payment_source: {
        token: {
          id: setupToken,
          type: "SETUP_TOKEN",
        },
      },
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`payment-token failed: ${res.status} ${body}`);
  return JSON.parse(body); // returns {id: <vault_id>, customer: {id: ...}, ...}
}

async function createSubscriptionWithToken(accessToken: string, planId: string, paymentTokenId: string) {
  const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `${Date.now()}-subs`,
    },
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
      },
      // Key bit: use vaulted payment token (card) so there is NO PayPal login
      payment_source: {
        token: {
          id: paymentTokenId,
          type: "PAYMENT_METHOD_TOKEN",
        },
      },
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`subscription failed: ${res.status} ${body}`);
  return JSON.parse(body);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const action = body?.action as string;

    // 1) Provide client config (for JS SDK on the front-end)
    if (action === "get_config") {
      return new Response(
        JSON.stringify({ clientId: PAYPAL_CLIENT_ID, environment: PAYPAL_ENV }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const accessToken = await getAccessToken();

    // 2) Create setup token (server)
    if (action === "create_setup_token") {
      const setup = await createSetupToken(accessToken);
      return new Response(JSON.stringify(setup), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Exchange for payment token + create subscription (no PayPal login)
    if (action === "create_subscription_with_vault") {
      const planType = (body?.plan_type || "").toString();
      const planId = PLAN_MAP[planType];
      if (!planId) {
        return new Response(JSON.stringify({ error: `Unknown plan_type ${planType}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const setupToken = (body?.vault_setup_token || "").toString();
      if (!setupToken) {
        return new Response(JSON.stringify({ error: "vault_setup_token required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Swap setup->payment token
      const paymentTok = await createPaymentTokenFromSetup(accessToken, setupToken);
      const vaultId = paymentTok?.id as string;
      if (!vaultId) throw new Error("No payment token id returned from PayPal");

      // Create subscription using the vaulted card
      const sub = await createSubscriptionWithToken(accessToken, planId, vaultId);

      // Persist minimal local record so your UI can show it / success page can poll
      // Adjust these table/columns to your schema if needed.
      const providerId = sub?.id as string;
      const status = (sub?.status || "pending").toLowerCase();

      const { data: inserted, error: insErr } = await sb
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_type: planType,
          status,
          provider_subscription_id: providerId,
        })
        .select("id")
        .single();

      if (insErr) {
        // Not fatal for the external subscription; report but still return subscription data
        console.warn("DB insert failed:", insErr);
      }

      return new Response(
        JSON.stringify({
          status: sub?.status?.toLowerCase(),
          subscription_id: providerId,
          local_subscription_id: inserted?.id || null,
          raw: sub,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fallback / unknown action
    return new Response(JSON.stringify({ error: "Unsupported action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err?.message || "Unhandled error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
