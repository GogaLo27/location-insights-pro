import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Json = Record<string, any>;

const ENV = {
  PAYPAL_ENV: Deno.env.get("PAYPAL_ENV") || "live",
  PAYPAL_CLIENT_ID: Deno.env.get("PAYPAL_CLIENT_ID")!,
  PAYPAL_CLIENT_SECRET: Deno.env.get("PAYPAL_CLIENT_SECRET")!,
  PAYPAL_PLAN_STARTER: Deno.env.get("PAYPAL_PLAN_STARTER")!,
  PAYPAL_PLAN_PROFESSIONAL: Deno.env.get("PAYPAL_PLAN_PROFESSIONAL")!,
  PAYPAL_PLAN_ENTERPRISE: Deno.env.get("PAYPAL_PLAN_ENTERPRISE")!,
  BRAND_NAME: Deno.env.get("BRAND_NAME") || "Location Insights Pro",
};

const API_BASE =
  ENV.PAYPAL_ENV === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

function planIdFor(planType: string): string {
  switch (planType) {
    case "starter":
      return ENV.PAYPAL_PLAN_STARTER;
    case "professional":
      return ENV.PAYPAL_PLAN_PROFESSIONAL;
    case "enterprise":
      return ENV.PAYPAL_PLAN_ENTERPRISE;
    default:
      throw new Error(`Unknown plan_type: ${planType}`);
  }
}

async function getAccessToken(): Promise<string> {
  const auth = btoa(`${ENV.PAYPAL_CLIENT_ID}:${ENV.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function createRedirectSubscription(
  accessToken: string,
  planId: string,
  returnUrl: string,
  cancelUrl: string
) {
  const res = await fetch(`${API_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
    },
    body: JSON.stringify({
      plan_id: planId,
      payment_method: {
        payer_selected: "PAYPAL",
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
      },
      application_context: {
        brand_name: ENV.BRAND_NAME,
        user_action: "SUBSCRIBE_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
        },
        shipping_preference: "NO_SHIPPING"
      }
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      `Create subscription failed: ${res.status} ${JSON.stringify(json)}`
    );
  }

  const approval = (json.links || []).find((l: any) => l.rel === "approve")
    ?.href;
  return { subscription: json, approval_url: approval };
}

Deno.serve(async (req) => {
  try {
    const { plan_type, return_url, cancel_url } = await req.json();

    if (!plan_type || !return_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: "Missing plan_type/return_url/cancel_url" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = await getAccessToken();
    const planId = planIdFor(plan_type);
    const { subscription, approval_url } = await createRedirectSubscription(
      token,
      planId,
      return_url,
      cancel_url
    );

    return new Response(
      JSON.stringify({
        subscription_id: subscription.id,
        status: subscription.status,
        approval_url,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});