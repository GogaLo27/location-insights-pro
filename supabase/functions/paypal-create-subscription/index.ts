// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-authorization",
  "Access-Control-Max-Age": "86400",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET    = Deno.env.get("PAYPAL_SECRET")!;
const PAYPAL_BASE      = Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";

if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
  throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_SECRET env vars");
}
if (!PAYPAL_BASE.startsWith("http")) {
  throw new Error(`Invalid PAYPAL_BASE_URL: ${PAYPAL_BASE}`);
}

async function paypalToken() {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PayPal token failed ${res.status}: ${txt}`);
  }
  const json = await res.json();
  return json.access_token as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(auth || "");
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const { plan_type, return_url, cancel_url } = await req.json();

    // 1) Look up the PayPal plan id for this plan_type
    const { data: planRow, error: planErr } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("plan_type", plan_type)
      .single();
    if (planErr || !planRow) throw new Error("Unknown plan_type");

    // 2) Create local subscription (pending)
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .insert({ user_id: user.id, plan_type, status: "pending" })
      .select("*")
      .single();
    if (subErr) throw subErr;

    // 3) Create PayPal subscription
    const token = await paypalToken();
    const resp = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        plan_id: planRow.provider_plan_id,
        application_context: {
          user_action: "SUBSCRIBE_NOW",
          brand_name: "Location Insights Pro",
          return_url,
          cancel_url,
        },
        custom_id: sub.id, // link the webhook back to our row
      }),
    });

    const json = await resp.json();
    if (!resp.ok) {
      console.error("PayPal create sub failed", json);
      return new Response(JSON.stringify({ error: "PayPal create failed", details: json }), { status: 400, headers: cors });
    }

    await supabase
      .from("subscriptions")
      .update({ provider_subscription_id: json.id, raw: json })
      .eq("id", sub.id);

    const approval = (json.links || []).find((l: any) => l.rel === "approve")?.href;
    return new Response(JSON.stringify({ approval_url: approval, subscription_id: sub.id }), { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), { status: 500, headers: cors });
  }
});
