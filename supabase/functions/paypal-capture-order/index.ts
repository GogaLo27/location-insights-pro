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
  if (req.method !== "POST") return new Response("ok", { status: 200, headers: cors });

  try {
    // require logged-in user (keeps parity with your other function)
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(auth || "");
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });

    const { orderId } = await req.json();
    if (!orderId) return new Response(JSON.stringify({ error: "orderId required" }), { status: 400, headers: cors });

    const access = await paypalToken();

    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
    });

    const json = await r.json();
    if (!r.ok) {
      console.error("PayPal capture failed", json);
      return new Response(JSON.stringify({ error: "PayPal capture failed", details: json }), { status: r.status, headers: cors });
    }

    // OPTIONAL: persist a lightweight payment record (fits your style; adjust table if needed)
    // await supabase.from("payments").insert({
    //   user_id: user.id,
    //   provider: "paypal",
    //   provider_order_id: orderId,
    //   status: json.status,
    //   raw: json,
    // });

    return new Response(JSON.stringify(json), { status: 200, headers: cors });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), { status: 500, headers: cors });
  }
});
