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

    const { subscription_id, refund_reason } = await req.json()

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

    // Check if subscription is eligible for refund
    if (!subscription.can_refund) {
      return new Response(JSON.stringify({ error: "Subscription is not eligible for refund" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    // Check if refund is within eligible period
    if (subscription.refund_eligible_until && new Date() > new Date(subscription.refund_eligible_until)) {
      return new Response(JSON.stringify({ error: "Refund period has expired" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    // Get latest payment transaction
    const { data: latestPayment, error: paymentError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("subscription_id", subscription_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (paymentError || !latestPayment) {
      return new Response(JSON.stringify({ error: "No completed payment found for refund" }), { 
        status: 404, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    if (!latestPayment.paypal_transaction_id) {
      return new Response(JSON.stringify({ error: "PayPal transaction ID not found" }), { 
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

    // Create refund
    const refundPayload = {
      amount: {
        value: (latestPayment.amount_cents / 100).toFixed(2),
        currency_code: latestPayment.currency
      },
      note_to_payer: refund_reason || "Refund requested by user"
    }

    const refundResponse = await fetch(`${baseUrl}/v2/payments/sale/${latestPayment.paypal_transaction_id}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': crypto.randomUUID()
      },
      body: JSON.stringify(refundPayload)
    })

    if (!refundResponse.ok) {
      const errorText = await refundResponse.text()
      console.error("PayPal refund failed:", errorText)
      throw new Error(`Failed to process PayPal refund: ${errorText}`)
    }

    const refundData = await refundResponse.json()

    // Update subscription in database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        can_refund: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", subscription_id)

    if (updateError) {
      console.error("Error updating subscription:", updateError)
      return new Response(JSON.stringify({ 
        error: "Failed to update subscription status" 
      }), { 
        status: 500, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    // Update payment transaction status
    await supabase
      .from("payment_transactions")
      .update({
        status: "refunded",
        updated_at: new Date().toISOString()
      })
      .eq("id", latestPayment.id)

    // Log refund event
    await supabase
      .from("subscription_events")
      .insert({
        subscription_id: subscription_id,
        event_type: "refund_processed",
        event_data: {
          refund_id: refundData.id,
          refund_amount: latestPayment.amount_cents,
          refund_currency: latestPayment.currency,
          refund_reason: refund_reason || "User requested refund",
          refunded_at: new Date().toISOString()
        }
      })

    return new Response(JSON.stringify({
      success: true,
      message: "Refund processed successfully",
      refund_id: refundData.id
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error processing PayPal refund:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to process refund" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})
