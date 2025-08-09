// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";

export const PAYPAL_BASE =
  Deno.env.get("PAYPAL_BASE_URL") || "https://api-m.sandbox.paypal.com";

const PAYPAL_CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID")!;
const PAYPAL_SECRET = Deno.env.get("PAYPAL_SECRET")!;

export async function getPaypalAccessToken(): Promise<string> {
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
