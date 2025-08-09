// /supabase/functions/paypal-webhook/index.ts
// Verifies PayPal webhook via their Verify API, then updates your DB accordingly.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const PAYPAL_BASE = Deno.env.get("PAYPAL_BASE") || "https://api-m.paypal.com";
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("PAYPAL_SECRET")!;
const WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID")!;
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

async function insertEvent(event_type: string, subscription_id: string | null, raw: any) {
  await fetch(`${SUPABASE_URL}/rest/v1/subscription_events`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type, subscription_id, raw }),
  });
}

async function updateSubscriptionByProviderId(providerId: string, patch: any) {
  await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?provider_subscription_id=eq.${providerId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return j(405, { error: "Method not allowed" });

  const transmissionId = req.headers.get("paypal-transmission-id");
  const transmissionTime = req.headers.get("paypal-transmission-time");
  const certUrl = req.headers.get("paypal-cert-url");
  const authAlgo = req.headers.get("paypal-auth-algo");
  const transmissionSig = req.headers.get("paypal-transmission-sig");

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return j(400, { error: "Invalid JSON" });
  }

  try {
    // Verify webhook
    const token = await getAccessToken();
    const verifyRes = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: WEBHOOK_ID,
        webhook_event: body,
      }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || (verifyData?.verification_status !== "SUCCESS" && verifyData?.verification_status !== "SUCCESSFUL" && verifyData?.verification_status !== "VERIFIED")) {
      return j(400, { error: "webhook_verification_failed", details: verifyData });
    }

    const eventType = body?.event_type || "";
    const resource = body?.resource || {};
    const providerId = resource?.id || resource?.billing_agreement_id || null;

    // Record event
    await insertEvent(eventType, null, body);

    // Update subscription row by provider id if we have one
    if (providerId) {
      if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED") {
        const nextEnd = resource?.billing_info?.next_billing_time || null;
        await updateSubscriptionByProviderId(providerId, { status: "active", current_period_end: nextEnd });
      } else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED") {
        await updateSubscriptionByProviderId(providerId, { status: "canceled" });
      } else if (eventType === "BILLING.SUBSCRIPTION.SUSPENDED") {
        await updateSubscriptionByProviderId(providerId, { status: "paused" });
      } else if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
        await updateSubscriptionByProviderId(providerId, { status: "expired" });
      } else if (eventType === "BILLING.SUBSCRIPTION.UPDATED") {
        const nextEnd = resource?.billing_info?.next_billing_time || null;
        await updateSubscriptionByProviderId(providerId, { current_period_end: nextEnd });
      }
    }

    return j(200, { ok: true });
  } catch (e: any) {
    return j(500, { error: "server_error", message: e?.message || String(e) });
  }
});
