// /supabase/functions/paypal-sync-subscription/index.ts
// Poll PayPal for a subscription, mirror status/period_end into your DB.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE") || "https://api-m.paypal.com";
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("PAYPAL_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function j(status: number, body: any) {
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
  if (!res.ok) throw new Error(`OAuth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return j(405, { error: "Method not allowed" });
  const { local_subscription_id, provider_subscription_id } = await req.json();

  if (!local_subscription_id && !provider_subscription_id) {
    return j(400, { error: "Provide local_subscription_id or provider_subscription_id" });
  }

  try {
    const token = await getAccessToken();
    const subId = provider_subscription_id;
    if (!subId) return j(400, { error: "Missing provider_subscription_id" });

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return j(res.status, { error: "paypal_fetch_failed", details: data });

    // Map fields
    const status = data?.status || "pending";
    const nextEnd = data?.billing_info?.next_billing_time || null;

    // Update DB
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${local_subscription_id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        status,
        provider_subscription_id: subId,
        current_period_end: nextEnd,
      }),
    });

    const dbData = await dbRes.json();
    if (!dbRes.ok) return j(dbRes.status, { error: "db_update_failed", details: dbData });

    return j(200, { ok: true, sub: dbData?.[0] || null });
  } catch (e: any) {
    return j(500, { error: "server_error", message: e?.message || String(e) });
  }
});
