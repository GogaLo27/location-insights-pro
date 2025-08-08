// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, paypal-auth-algo, paypal-cert-url, paypal-transmission-id, paypal-transmission-sig, paypal-transmission-time, webhook-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET    = Deno.env.get("PAYPAL_SECRET")!;
const PAYPAL_BASE      = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";
const PAYPAL_WEBHOOK_ID= Deno.env.get("PAYPAL_WEBHOOK_ID")!; // set after creating webhook in PayPal app

async function paypalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token failed: ${res.status}`);
  const json = await res.json();
  return json.access_token as string;
}

async function verifySignature(headers: Headers, body: any) {
  const token = await paypalToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    }),
  });
  const j = await res.json();
  return j.verification_status === "SUCCESS";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const body = await req.json();
    const ok = await verifySignature(req.headers, body);
    if (!ok) return new Response("Invalid signature", { status: 400, headers: cors });

    const event    = body.event_type as string;
    const resource = body.resource || {};
    const paypalSubId = resource.id || resource.subscription_id;
    const custom_id   = resource.custom_id; // our subscription row id

    // Find our subscription row (prefer custom_id we created)
    let subRow: any = null;
    if (custom_id) {
      const { data } = await supabase.from("subscriptions").select("*").eq("id", custom_id).single();
      subRow = data;
    } else if (paypalSubId) {
      const { data } = await supabase.from("subscriptions").select("*").eq("provider_subscription_id", paypalSubId).maybeSingle();
      subRow = data;
    }

    // Log the event (optional)
    if (subRow?.id) {
      await supabase.from("subscription_events").insert({
        subscription_id: subRow.id, event_type: event, payload: body
      });
    }

    // Build updates based on event type
    const updates: any = {};
    switch (event) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        updates.status = "active";
        updates.start_date = new Date().toISOString();
        break;
      case "BILLING.SUBSCRIPTION.SUSPENDED":
        updates.status = "suspended"; break;
      case "BILLING.SUBSCRIPTION.CANCELLED":
        updates.status = "cancelled";
        updates.canceled_at = new Date().toISOString(); break;
      case "BILLING.SUBSCRIPTION.EXPIRED":
        updates.status = "expired"; break;
      case "PAYMENT.SALE.COMPLETED":
        // Optionally compute current_period_end, etc.
        break;
      default:
        // ignore others
        break;
    }

    if (resource?.subscriber?.email_address)
      updates.payer_email = resource.subscriber.email_address;

    if (subRow?.id && Object.keys(updates).length) {
      updates.updated_at = new Date().toISOString();
      await supabase.from("subscriptions").update(updates).eq("id", subRow.id);

      // BONUS: keep your existing user_plans table in sync when we activate
      if (updates.status === "active" && subRow.user_id && subRow.plan_type) {
        await supabase.from("user_plans").upsert({
          user_id: subRow.user_id,
          plan_type: subRow.plan_type,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      }
    }

    return new Response("ok", { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500, headers: cors });
  }
});
