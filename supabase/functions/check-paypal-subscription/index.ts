import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const { subscription_id } = await req.json()

    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "Subscription ID is required" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    // Get PayPal credentials
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
    const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'
    const baseUrl = mode === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

    if (!clientId || !clientSecret) {
      throw new Error("PayPal configuration missing")
    }

    // Get access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Failed to get PayPal access token: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get subscription details from PayPal
    const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscription_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text()
      throw new Error(`Failed to get PayPal subscription: ${errorText}`)
    }

    const subscriptionData = await subscriptionResponse.json()

    return new Response(JSON.stringify({
      success: true,
      subscription: subscriptionData
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error checking PayPal subscription:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to check subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})
