import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paypal-transmission-id, paypal-cert-id, paypal-auth-algo',
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface PayPalWebhookEvent {
  id: string
  event_type: string
  create_time: string
  resource_type: string
  resource: any
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const body = await req.text()
    const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'

    console.log("=== PAYPAL WEBHOOK RECEIVED ===")
    console.log("Mode:", mode)
    console.log("Method:", req.method)
    console.log("Headers:", Object.fromEntries(req.headers.entries()))
    console.log("Body:", body)

    // Parse the webhook event
    const event: PayPalWebhookEvent = JSON.parse(body)
    console.log(`Processing PayPal webhook event: ${event.event_type}`)
    console.log(`Full webhook payload:`, JSON.stringify(event, null, 2))

    // Route to appropriate handler based on event type
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(supabase, event)
        break
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(supabase, event)
        break
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(supabase, event)
        break
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(supabase, event)
        break
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionExpired(supabase, event)
        break
      case 'PAYMENT.SALE.COMPLETED':
        await handlePaymentCompleted(supabase, event)
        break
      default:
        console.log(`Unhandled PayPal webhook event: ${event.event_type}`)
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { ...cors, "Content-Type": "application/json" } 
    })

  } catch (error) {
    console.error("Error processing PayPal webhook:", error)
    return new Response(JSON.stringify({ error: error.message || "Failed to process webhook" }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" } 
    })
  }
})

async function handleSubscriptionCreated(supabase: any, event: PayPalWebhookEvent) {
  console.log("Handling subscription created event")
  const subscription = event.resource
  
  try {
    // Find the subscription by PayPal subscription ID
    const { data: existingSub, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('paypal_subscription_id', subscription.id)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      console.error("Error finding subscription:", findError)
      return
    }

    if (existingSub) {
      console.log("Subscription already exists, updating status")
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'pending',
          paypal_agreement_id: subscription.agreement_details?.agreement_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSub.id)

      if (updateError) {
        console.error("Error updating subscription:", updateError)
      } else {
        console.log("Subscription updated successfully")
      }
    } else {
      console.log("No existing subscription found for PayPal ID:", subscription.id)
    }
  } catch (error) {
    console.error("Error in handleSubscriptionCreated:", error)
  }
}

async function handleSubscriptionActivated(supabase: any, event: PayPalWebhookEvent) {
  console.log("Handling subscription activated event")
  const subscription = event.resource
  
  try {
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_end: subscription.billing_info?.next_billing_time 
          ? new Date(subscription.billing_info.next_billing_time).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscription.id)

    if (updateError) {
      console.error("Error updating subscription to active:", updateError)
    } else {
      console.log("Subscription activated successfully")
    }
  } catch (error) {
    console.error("Error in handleSubscriptionActivated:", error)
  }
}

async function handleSubscriptionUpdated(supabase: any, event: PayPalWebhookEvent) {
  console.log("Handling subscription updated event")
  const subscription = event.resource
  
  try {
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: subscription.status?.toLowerCase() || 'active',
        current_period_end: subscription.billing_info?.next_billing_time 
          ? new Date(subscription.billing_info.next_billing_time).toISOString()
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscription.id)

    if (updateError) {
      console.error("Error updating subscription:", updateError)
    } else {
      console.log("Subscription updated successfully")
    }
  } catch (error) {
    console.error("Error in handleSubscriptionUpdated:", error)
  }
}

async function handleSubscriptionCancelled(supabase: any, event: PayPalWebhookEvent) {
  console.log("Handling subscription cancelled event")
  const subscription = event.resource
  
  try {
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscription.id)

    if (updateError) {
      console.error("Error cancelling subscription:", updateError)
    } else {
      console.log("Subscription cancelled successfully")
    }
  } catch (error) {
    console.error("Error in handleSubscriptionCancelled:", error)
  }
}

async function handleSubscriptionExpired(supabase: any, event: PayPalWebhookEvent) {
  console.log("Handling subscription expired event")
  const subscription = event.resource
  
  try {
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('paypal_subscription_id', subscription.id)

    if (updateError) {
      console.error("Error expiring subscription:", updateError)
    } else {
      console.log("Subscription expired successfully")
    }
  } catch (error) {
    console.error("Error in handleSubscriptionExpired:", error)
  }
}

async function handlePaymentCompleted(supabase: any, event: PayPalWebhookEvent) {
  console.log("Handling payment completed event")
  const payment = event.resource
  
  try {
    // This would handle payment completion events
    console.log("Payment completed for subscription:", payment.billing_agreement_id)
  } catch (error) {
    console.error("Error in handlePaymentCompleted:", error)
  }
}
