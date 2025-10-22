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

    if (subscription.status !== 'active') {
      return new Response(JSON.stringify({ error: "Subscription is not active" }), { 
        status: 400, 
        headers: { ...cors, "Content-Type": "application/json" } 
      })
    }

    // Get LemonSqueezy credentials
    const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY')
    if (!apiKey) {
      throw new Error("LemonSqueezy API key not configured")
    }

    // Cancel subscription in LemonSqueezy
    if (subscription.provider_subscription_id) {
      const cancelResponse = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${subscription.provider_subscription_id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/vnd.api+json",
          "Accept": "application/vnd.api+json"
        }
      })

      if (!cancelResponse.ok) {
        const errorText = await cancelResponse.text()
        console.error("LemonSqueezy cancellation failed:", errorText)
        return new Response(JSON.stringify({ 
          error: "Failed to cancel subscription in LemonSqueezy", 
          details: errorText 
        }), { 
          status: 400, 
          headers: { ...cors, "Content-Type": "application/json" } 
        })
      }
    }

    // Update subscription in database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_at_period_end: true,
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

    // Log cancellation event
    await supabase
      .from("subscription_events")
      .insert({
        subscription_id: subscription_id,
        event_type: "subscription_cancelled",
        event_data: {
          cancelled_by: "user",
          reason: reason || "User requested cancellation",
          cancelled_at: new Date().toISOString()
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
    console.error("Error cancelling subscription:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to cancel subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" } 
    })
  }
})
