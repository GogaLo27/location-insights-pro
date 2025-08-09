// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET    = Deno.env.get("PAYPAL_SECRET")!;
const PAYPAL_BASE      = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID")!;

async function paypalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`token ${res.status}: ${txt}`);
  return JSON.parse(txt).access_token as string;
}

async function verifySignature(headers: Headers, body: any) {
  const token = await paypalToken();
  const payload = {
    auth_algo:         headers.get("paypal-auth-algo"),
    cert_url:          headers.get("paypal-cert-url"),
    transmission_id:   headers.get("paypal-transmission-id"),
    transmission_sig:  headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id:        PAYPAL_WEBHOOK_ID,
    webhook_event:     body,
  };

  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`verify ${res.status}: ${JSON.stringify(json)}`);
  return json.verification_status === "SUCCESS";
}

function mapPayPalStatus(eventType: string, resourceStatus?: string) {
  // Normalize to our subscription.status values
  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      return "active";
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      return "suspended";
    case "BILLING.SUBSCRIPTION.CANCELLED":
      return "canceled";
    case "BILLING.SUBSCRIPTION.EXPIRED":
      return "expired";
    case "BILLING.SUBSCRIPTION.CREATED":
      // PayPal may send CREATED first; keep as pending until ACTIVATED
      return resourceStatus?.toLowerCase() || "pending";
    default:
      return resourceStatus?.toLowerCase() || undefined;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    console.log("[webhook] event:", body?.event_type, "id:", body?.resource?.id);

    // Verify signature
    const ok = await verifySignature(req.headers, body);
    if (!ok) {
      console.error("[webhook] signature verification FAILED");
      return new Response("bad signature", { status: 400, headers: cors });
    }

    const eventType = body.event_type as string;
    const resource  = body.resource || {};
    const providerId = resource.id as string; // PayPal subscription id

    if (!providerId) {
      console.warn("[webhook] missing resource.id");
      return new Response("ok", { status: 200, headers: cors });
    }

    // Find our local subscription row by provider_subscription_id
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("provider_subscription_id", providerId)
      .maybeSingle();

    if (!sub) {
      console.warn("[webhook] local subscription not found for", providerId);
      return new Response("ok", { status: 200, headers: cors });
    }

    const newStatus = mapPayPalStatus(eventType, resource.status);
    if (newStatus) {
      await supabase.from("subscriptions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", sub.id);

      // When ACTIVE, ensure user_plans is in sync
      if (newStatus === "active") {
        await supabase.from("user_plans").upsert({
          user_id: sub.user_id,
          plan_type: sub.plan_type,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      }
    }

    return new Response("ok", { status: 200, headers: cors });
  } catch (e) {
    console.error("[webhook error]", e);
    return new Response("error", { status: 500, headers: cors });
  }
});
