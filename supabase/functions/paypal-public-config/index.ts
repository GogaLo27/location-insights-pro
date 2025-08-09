// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "GET") return new Response("ok", { status: 200, headers: cors });

  if (!PAYPAL_CLIENT_ID) {
    return new Response(JSON.stringify({ error: "PAYPAL_CLIENT_ID not set" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ client_id: PAYPAL_CLIENT_ID }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" }
  });
});
