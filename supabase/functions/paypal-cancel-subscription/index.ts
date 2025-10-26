import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
)

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(auth || "")
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors })

    const { subscription_id, reason } = await req.json()

    if (!subscription_id) {
      return new Response(JSON.stringify({ error: "Subscription ID is required" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .eq("user_id", user.id)
      .single()

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), { 
        status: 404, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    if (!subscription.paypal_subscription_id) {
      return new Response(JSON.stringify({ error: "PayPal subscription ID not found" }), { 
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

    // Cancel PayPal subscription
    const cancelPayload = {
      reason: reason || "User requested cancellation"
    }

    const cancelResponse = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscription.paypal_subscription_id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': crypto.randomUUID()
      },
      body: JSON.stringify(cancelPayload)
    })

    if (!cancelResponse.ok) {
      const errorText = await cancelResponse.text()
      console.error("PayPal subscription cancellation failed:", errorText)
      throw new Error(`Failed to cancel PayPal subscription: ${errorText}`)
    }

    // Update local subscription to cancelled status
    // User keeps access until expiration, then gets downgraded automatically
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription_id)

    if (updateError) {
      console.error("Error updating subscription:", updateError)
      throw updateError
    }

    // NOTE: We do NOT downgrade the user here
    // User keeps their paid plan features until the subscription expires
    // The webhook will handle downgrade when BILLING.SUBSCRIPTION.EXPIRED fires
    console.log("Subscription marked as cancelled. User keeps access until expiration.")

    // Log cancellation event
    await supabase
      .from("subscription_events")
      .insert({
        subscription_id: subscription_id,
        event_type: "subscription_cancelled",
        event_data: {
          reason: reason || "User requested cancellation",
          cancelled_at: new Date().toISOString(),
          paypal_subscription_id: subscription.paypal_subscription_id
        }
      })

    return new Response(JSON.stringify({
      success: true,
      message: "Subscription cancelled successfully"
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error cancelling PayPal subscription:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to cancel subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})
