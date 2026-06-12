import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DODO_WEBHOOK_SECRET = Deno.env.get('DODO_WEBHOOK_SECRET') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// Verify HMAC-SHA256 webhook signature from Dodo.
// NOTE: Confirm the exact header name and signature format from Dodo's webhook docs.
// Common formats: plain hex digest, base64 digest, or "t=TIMESTAMP,v1=HASH"
async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  if (!DODO_WEBHOOK_SECRET) return true // skip verification if secret not configured
  if (!signature) return false
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(DODO_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
    const expectedHex = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(mac)))
    return signature === expectedHex || signature === expectedB64 || signature.includes(expectedHex)
  } catch {
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200 })

  try {
    const rawBody = await req.text()
    if (!rawBody) return new Response(JSON.stringify({ received: true }), { status: 200 })

    // NOTE: Verify exact header name from Dodo's webhook documentation
    const signature = req.headers.get('webhook-signature')
      ?? req.headers.get('x-dodo-signature')
      ?? req.headers.get('x-webhook-signature')
      ?? ''

    const isValid = await verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      console.error('Invalid Dodo webhook signature')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const { type, data } = event
    console.log(`Dodo webhook received: ${type}`)

    switch (type) {
      case 'subscription.active':
        await handleSubscriptionActive(data)
        break
      case 'payment.succeeded':
        await handlePaymentSucceeded(data)
        break
      case 'subscription.renewed':
        await handleSubscriptionRenewed(data)
        break
      case 'subscription.on_hold':
        await handleSubscriptionOnHold(data)
        break
      case 'subscription.failed':
        await handleSubscriptionFailed(data)
        break
      case 'subscription.updated':
        await logSubscriptionEvent(data, 'subscription_updated')
        break
      default:
        console.log(`Unhandled Dodo event: ${type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Dodo webhook error:', error)
    // Return 200 to prevent Dodo from retrying on processing errors
    return new Response(JSON.stringify({ received: true, error: error.message }), { status: 200 })
  }
})

// NOTE: Verify exact field names against Dodo's API reference before going live.
// The subscription data object fields used below follow common MoR provider conventions.

async function handleSubscriptionActive(data: any) {
  const dodoSubscriptionId = data.subscription_id
  const customerEmail = data.customer?.email
  const dodoCustomerId = data.customer?.customer_id ?? data.customer_id

  if (!customerEmail || !dodoSubscriptionId) {
    console.error('subscription.active: missing subscription_id or customer.email', data)
    return
  }

  // Find the user account by email
  const { data: { user }, error: userErr } = await supabase.auth.admin.getUserByEmail(customerEmail)
  if (userErr || !user) {
    console.error('subscription.active: user not found for email:', customerEmail)
    return
  }

  // Find the pending Dodo subscription created when user initiated checkout
  const { data: subscription, error: subErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'dodo')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (subErr || !subscription) {
    console.error('subscription.active: no pending Dodo subscription for user:', user.id)
    return
  }

  const now = new Date()
  const periodEnd = data.current_period_end
    ?? data.next_billing_at
    ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      dodo_subscription_id: dodoSubscriptionId,
      dodo_customer_id: dodoCustomerId ?? null,
      current_period_start: data.current_period_start ?? now.toISOString(),
      current_period_end: periodEnd,
      updated_at: now.toISOString(),
    })
    .eq('id', subscription.id)

  // Cancel any other active subscriptions for this user
  const { data: otherSubs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .neq('id', subscription.id)

  if (otherSubs?.length) {
    for (const old of otherSubs) {
      await supabase.from('subscriptions').update({
        status: 'cancelled',
        cancelled_at: now.toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', old.id)
    }
  }

  // Upsert active plan record
  await supabase.from('user_plans').upsert({
    user_id: user.id,
    plan_type: subscription.plan_type,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: 'user_id' })

  // Generate invoice (payment_id will be back-filled when payment.succeeded fires)
  await generateInvoiceForDodo(subscription)

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: 'subscription_activated',
    dodo_event_id: dodoSubscriptionId,
    event_data: data,
  })
}

async function handlePaymentSucceeded(data: any) {
  // NOTE: Verify field names from Dodo's payment.succeeded webhook payload docs
  const dodoSubscriptionId = data.subscription_id
  const dodoPaymentId = data.payment_id ?? data.id

  if (!dodoPaymentId) {
    console.log('payment.succeeded: no payment_id in payload, skipping')
    return
  }

  if (!dodoSubscriptionId) return

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .single()

  if (!subscription) return

  // Store payment ID on subscription for refund use
  await supabase
    .from('subscriptions')
    .update({ dodo_payment_id: dodoPaymentId, updated_at: new Date().toISOString() })
    .eq('id', subscription.id)

  // Back-fill the payment ID on the latest invoice that doesn't have it yet
  const { data: latestInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('subscription_id', subscription.id)
    .is('dodo_payment_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (latestInvoice) {
    await supabase
      .from('invoices')
      .update({ dodo_payment_id: dodoPaymentId })
      .eq('id', latestInvoice.id)
  }

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: 'payment_succeeded',
    dodo_event_id: dodoPaymentId,
    event_data: data,
  })
}

async function handleSubscriptionRenewed(data: any) {
  const dodoSubscriptionId = data.subscription_id
  if (!dodoSubscriptionId) return

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .single()

  if (!subscription) {
    console.error('subscription.renewed: subscription not found:', dodoSubscriptionId)
    return
  }

  const now = new Date()
  const newPeriodEnd = data.current_period_end
    ?? data.next_billing_at
    ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_end: newPeriodEnd,
      updated_at: now.toISOString(),
    })
    .eq('id', subscription.id)

  // Generate renewal invoice
  await generateInvoiceForDodo(subscription)

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: 'subscription_renewed',
    dodo_event_id: dodoSubscriptionId,
    event_data: data,
  })
}

async function handleSubscriptionOnHold(data: any) {
  const dodoSubscriptionId = data.subscription_id
  if (!dodoSubscriptionId) return

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .single()

  if (!subscription) return

  await supabase.from('subscriptions').update({
    status: 'past_due',
    updated_at: new Date().toISOString(),
  }).eq('id', subscription.id)

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: 'subscription_on_hold',
    dodo_event_id: dodoSubscriptionId,
    event_data: data,
  })
}

async function handleSubscriptionFailed(data: any) {
  const dodoSubscriptionId = data.subscription_id
  const customerEmail = data.customer?.email

  let subscriptionId: string | null = null

  if (dodoSubscriptionId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('dodo_subscription_id', dodoSubscriptionId)
      .single()
    if (sub) subscriptionId = sub.id
  }

  // Fallback: match by customer email → pending subscription
  if (!subscriptionId && customerEmail) {
    const { data: { user } } = await supabase.auth.admin.getUserByEmail(customerEmail)
    if (user) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'dodo')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (sub) subscriptionId = sub.id
    }
  }

  if (!subscriptionId) return

  await supabase.from('subscriptions').update({
    status: 'failed',
    updated_at: new Date().toISOString(),
  }).eq('id', subscriptionId)

  await supabase.from('subscription_events').insert({
    subscription_id: subscriptionId,
    event_type: 'subscription_failed',
    dodo_event_id: dodoSubscriptionId ?? 'unknown',
    event_data: data,
  })
}

async function logSubscriptionEvent(data: any, eventType: string) {
  const dodoSubscriptionId = data.subscription_id
  if (!dodoSubscriptionId) return

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .single()

  if (!subscription) return

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: eventType,
    dodo_event_id: dodoSubscriptionId,
    event_data: data,
  })
}

async function generateInvoiceForDodo(subscription: any) {
  try {
    const { data: billingPlan } = await supabase
      .from('billing_plans')
      .select('price_cents')
      .eq('plan_type', subscription.plan_type)
      .eq('provider', 'dodo')
      .eq('is_active', true)
      .single()

    if (!billingPlan?.price_cents) {
      console.error('No active Dodo billing plan found for:', subscription.plan_type)
      return
    }

    const billingPeriodStart = new Date().toISOString()
    const billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await supabase.functions.invoke('generate-invoice', {
      body: {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        payment_method: 'dodo',
        transaction_id: subscription.dodo_subscription_id,
        amount_cents: billingPlan.price_cents,
        plan_type: subscription.plan_type,
        billing_period_start: billingPeriodStart,
        billing_period_end: billingPeriodEnd,
      }
    })
  } catch (err) {
    console.error('Failed to generate Dodo invoice:', err)
  }
}
