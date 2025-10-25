import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paypal-transmission-id, paypal-cert-id, paypal-auth-algo',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

interface PayPalWebhookEvent {
  id: string
  event_type: string
  create_time: string
  resource_type: string
  resource_version: string
  event_version: string
  summary: string
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
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')
    const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'

    console.log("PayPal webhook received in", mode, "mode")
    console.log("Request headers:", Object.fromEntries(req.headers.entries()))
    console.log("Request body:", body)

    // Skip all validation for sandbox mode
    if (mode === 'sandbox') {
      console.log("Processing webhook in sandbox mode - skipping all validation")
    } else {
      // Production validation would go here
      console.log("Production mode - would validate webhook here")
    }

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
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to process webhook" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})

async function handleSubscriptionCreated(supabase: any, event: PayPalWebhookEvent) {
  const subscription = event.resource
  const customId = subscription.custom_id

  if (!customId) {
    console.log("No custom_id found in subscription")
    return
  }

  // Update subscription status
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "pending",
      paypal_subscription_id: subscription.id,
      paypal_agreement_id: subscription.id,
      updated_at: new Date().toISOString()
    })
    .eq("id", customId)

  if (error) {
    console.error("Error updating subscription:", error)
    throw error
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: customId,
    event_type: "subscription_created",
    paypal_event_id: event.id,
    paypal_webhook_id: event.id,
    event_data: subscription,
    created_at: new Date().toISOString()
  })

  console.log("Subscription created event processed successfully")
}

async function handleSubscriptionActivated(supabase: any, event: PayPalWebhookEvent) {
  console.log("=== PAYPAL WEBHOOK DATA ===")
  console.log("Full event:", JSON.stringify(event, null, 2))
  
  const subscription = event.resource
  console.log("PayPal subscription ID:", subscription.id)
  console.log("PayPal subscription status:", subscription.status)
  console.log("PayPal plan ID:", subscription.plan_id)
  
  // Find subscription by PayPal subscription ID
  const { data: existingSub, error: findError } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan_type")
    .eq("paypal_subscription_id", subscription.id)
    .single()

  if (findError || !existingSub) {
    console.error("Could not find subscription by PayPal ID:", findError)
    console.log("Available subscriptions in database:")
    const { data: allSubs } = await supabase
      .from("subscriptions")
      .select("id, paypal_subscription_id, provider_subscription_id, status, plan_type")
      .order("created_at", { ascending: false })
      .limit(5)
    console.log("Recent subscriptions:", allSubs)
    return
  }

  console.log("Found subscription:", existingSub)
  
  // Update subscription status
  const { error: subError } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_end: subscription.billing_info?.next_billing_time 
        ? new Date(subscription.billing_info.next_billing_time).toISOString()
        : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", existingSub.id)

  if (subError) {
    console.error("Error updating subscription:", subError)
    return
  }

  console.log("Subscription updated successfully")
  
  // Update user_plans table
  const { error: planError } = await supabase
    .from("user_plans")
    .upsert({
      user_id: existingSub.user_id,
      plan_type: existingSub.plan_type,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
  
  if (planError) {
    console.error("Error updating user plan:", planError)
    return
  }

  console.log("User plan updated successfully")
  console.log("=== PAYPAL WEBHOOK PROCESSING COMPLETE ===")
}

async function handleSubscriptionUpdated(supabase: any, event: PayPalWebhookEvent) {
  const subscription = event.resource
  
  // Find subscription by PayPal subscription ID
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("paypal_subscription_id", subscription.id)
    .single()

  if (fetchError || !sub) {
    console.log("Subscription not found for update")
    return
  }

  // Update subscription
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: subscription.status.toLowerCase(),
      current_period_end: subscription.billing_info?.next_billing_time 
        ? new Date(subscription.billing_info.next_billing_time).toISOString()
        : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", sub.id)

  if (error) {
    console.error("Error updating subscription:", error)
    throw error
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "subscription_updated",
    paypal_event_id: event.id,
    paypal_webhook_id: event.id,
    event_data: subscription,
    created_at: new Date().toISOString()
  })

  console.log("Subscription updated event processed successfully")
}

async function handleSubscriptionCancelled(supabase: any, event: PayPalWebhookEvent) {
  const subscription = event.resource
  
  // Find subscription by PayPal subscription ID
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("paypal_subscription_id", subscription.id)
    .single()

  if (fetchError || !sub) {
    console.log("Subscription not found for cancellation")
    return
  }

  // Update subscription
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", sub.id)

  if (error) {
    console.error("Error updating subscription:", error)
    throw error
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "subscription_cancelled",
    paypal_event_id: event.id,
    paypal_webhook_id: event.id,
    event_data: subscription,
    created_at: new Date().toISOString()
  })

  console.log("Subscription cancelled event processed successfully")
}

async function handleSubscriptionExpired(supabase: any, event: PayPalWebhookEvent) {
  const subscription = event.resource
  
  // Find subscription by PayPal subscription ID
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("paypal_subscription_id", subscription.id)
    .single()

  if (fetchError || !sub) {
    console.log("Subscription not found for expiration")
    return
  }

  // Update subscription
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "expired",
      updated_at: new Date().toISOString()
    })
    .eq("id", sub.id)

  if (error) {
    console.error("Error updating subscription:", error)
    throw error
  }

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "subscription_expired",
    paypal_event_id: event.id,
    paypal_webhook_id: event.id,
    event_data: subscription,
    created_at: new Date().toISOString()
  })

  console.log("Subscription expired event processed successfully")
}

async function handlePaymentCompleted(supabase: any, event: PayPalWebhookEvent) {
  const payment = event.resource
  
  // Find subscription by PayPal subscription ID
  const { data: sub, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("paypal_subscription_id", payment.billing_agreement_id)
    .single()

  if (fetchError || !sub) {
    console.log("Subscription not found for payment")
    return
  }

  // Create payment transaction record
  await supabase.from("payment_transactions").insert({
    subscription_id: sub.id,
    amount_cents: Math.round(parseFloat(payment.amount.total) * 100),
    currency: payment.amount.currency,
    status: "completed",
    payment_method: "paypal",
    paypal_transaction_id: payment.id,
    paypal_payment_id: payment.id,
    created_at: new Date().toISOString()
  })

  // Create subscription event
  await supabase.from("subscription_events").insert({
    subscription_id: sub.id,
    event_type: "payment_completed",
    paypal_event_id: event.id,
    paypal_webhook_id: event.id,
    event_data: payment,
    created_at: new Date().toISOString()
  })

  console.log("Payment completed event processed successfully")
}
