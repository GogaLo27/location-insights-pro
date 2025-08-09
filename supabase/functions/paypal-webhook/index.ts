// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PAYPAL_CLIENT_ID  = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET     = Deno.env.get("PAYPAL_SECRET")!;
const PAYPAL_BASE       = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";
const PAYPAL_WEBHOOK_ID = Deno.env.get("PAYPAL_WEBHOOK_ID")!;

function requireEnv() {
  const missing: string[] = [];
  if (!PAYPAL_CLIENT_ID)  missing.push("PAYPAL_CLIENT_ID");
  if (!PAYPAL_SECRET)     missing.push("PAYPAL_SECRET");
  if (!PAYPAL_WEBHOOK_ID) missing.push("PAYPAL_WEBHOOK_ID");
  if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) throw new Error("Missing env: " + missing.join(", "));
}

async function getPaypalToken(): Promise<string> {
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`token ${r.status} ${t}`);
  return JSON.parse(t).access_token as string;
}

async function verifySignature(headers: Headers, payload: any): Promise<boolean> {
  const token = await getPaypalToken();
  const vr = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo:         headers.get("paypal-auth-algo"),
      cert_url:          headers.get("paypal-cert-url"),
      transmission_id:   headers.get("paypal-transmission-id"),
      transmission_sig:  headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id:        PAYPAL_WEBHOOK_ID,
      webhook_event:     payload,
    }),
  });
  const json = await vr.json();
  if (!vr.ok) throw new Error(`verify ${vr.status} ${JSON.stringify(json)}`);
  return json.verification_status === "SUCCESS";
}

function mapStatus(event: string, resourceStatus?: string) {
  switch (event) {
    case "BILLING.SUBSCRIPTION.ACTIVATED":
      return "active";
    case "BILLING.SUBSCRIPTION.SUSPENDED":
      return "suspended";
    case "BILLING.SUBSCRIPTION.CANCELLED":
      return "canceled";
    case "BILLING.SUBSCRIPTION.EXPIRED":
      return "expired";
    case "BILLING.SUBSCRIPTION.CREATED":
      return resourceStatus?.toLowerCase() || "pending";
    case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
    case "PAYMENT.SALE.DENIED":
      return "past_due";
    default:
      return resourceStatus?.toLowerCase();
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  try {
    requireEnv();

    const body = await req.json().catch(() => ({}));
    const eventType = body?.event_type as string;
    const resource  = body?.resource || {};
    const providerId = resource?.id as string | undefined;

    console.log("[paypal-webhook] event:", eventType, "provider:", providerId);

    // 1) Verify signature. If it fails, tell PayPal to retry (400) and log why.
    try {
      const ok = await verifySignature(req.headers, body);
      if (!ok) {
        console.error("[verify] status != SUCCESS");
        return new Response("signature failed", { status: 400 });
      }
    } catch (e) {
      console.error("[verify] error", e);
      return new Response("signature error", { status: 400 });
    }

    // 2) We only proceed with a subscription id
    if (!providerId) {
      console.error("[webhook] missing resource.id");
      return new Response("bad payload", { status: 400 });
    }

    // 3) Find our row
    const { data: sub, error: findErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("provider_subscription_id", providerId)
      .maybeSingle();

    if (findErr) {
      console.error("[db] select error", findErr);
      return new Response("db error", { status: 500 });
    }
    if (!sub) {
      console.error("[db] no local subscription for", providerId);
      return new Response("not found", { status: 404 });
    }

    // 4) Update status
    const newStatus = mapStatus(eventType, resource?.status);
    if (newStatus) {
      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", sub.id);
      if (updErr) {
        console.error("[db] update error", updErr);
        return new Response("db update error", { status: 500 });
      }

      if (newStatus === "active") {
        const { error: planErr } = await supabase.from("user_plans").upsert({
          user_id: sub.user_id,
          plan_type: sub.plan_type,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (planErr) {
          console.error("[db] user_plans upsert error", planErr);
          // but still return 200; plan sync can be retried on next event
        }
      }
    }

    // 5) Success → PayPal will mark “Sent”
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[webhook] fatal", e);
    return new Response("error", { status: 500 });
  }
});
