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

    // Check if refund is eligible
    if (!subscription.can_refund) {
      return new Response(JSON.stringify({ error: "Refund not eligible for this subscription" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    if (subscription.refund_eligible_until && new Date(subscription.refund_eligible_until) < new Date()) {
      return new Response(JSON.stringify({ error: "Refund period has expired" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    // Get LemonSqueezy credentials
    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')
    if (!apiKey) {
      throw new Error("LemonSqueezy API key not configured")
    }

    // Get the latest order for this subscription
    const { data: orders, error: ordersError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("subscription_id", subscription_id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)

    if (ordersError || !orders || orders.length === 0) {
      return new Response(JSON.stringify({ error: "No completed payment found for refund" }), { 
        status: 404, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    const latestOrder = orders[0]

    // Process refund in LemonSqueezy
    const refundResponse = await fetch(`https://api.lemonsqueezy.com/v1/orders/${latestOrder.transaction_id}/refund`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json"
      },
      body: JSON.stringify({
        data: {
          type: "refunds",
          attributes: {
            reason: refund_reason || "User requested refund"
          }
        }
      })
    })

    if (!refundResponse.ok) {
      const errorText = await refundResponse.text()
      console.error("LemonSqueezy refund failed:", errorText)
      return new Response(JSON.stringify({ 
        error: "Failed to process refund in LemonSqueezy", 
        details: errorText 
      }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
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
      .eq("id", latestOrder.id)

    // Log refund event
    await supabase
      .from("subscription_events")
      .insert({
        subscription_id: subscription_id,
        event_type: "refund_processed",
        event_data: {
          refund_id: refundData.data.id,
          refund_amount: latestOrder.amount_cents,
          refund_currency: latestOrder.currency,
          refund_reason: refund_reason || "User requested refund",
          refunded_at: new Date().toISOString()
        }
      })

    return new Response(JSON.stringify({
      success: true,
      message: "Refund processed successfully",
      refund_id: refundData.data.id
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error processing refund:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to process refund" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" } 
    })
  }
})
