import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DODO_WEBHOOK_SECRET = Deno.env.get('DODO_WEBHOOK_SECRET') ?? ''
const SKIP_SIG_VERIFY = Deno.env.get('DODO_SKIP_SIG_VERIFY') === 'true'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

async function verifyWebhookSignature(rawBody: string, headers: Headers): Promise<boolean> {
  if (!DODO_WEBHOOK_SECRET) {
    console.warn('DODO_WEBHOOK_SECRET not set — skipping verification')
    return true
  }
  const msgId = headers.get('webhook-id')
  const msgTimestamp = headers.get('webhook-timestamp')
  const msgSignature = headers.get('webhook-signature')
  if (!msgId || !msgTimestamp || !msgSignature) {
    console.error('Missing Svix headers')
    return false
  }
  const timestampMs = parseInt(msgTimestamp) * 1000
  if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    console.error('Webhook timestamp too old:', msgTimestamp)
    return false
  }
  try {
    const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
    const encoder = new TextEncoder()
    let secretBytes: Uint8Array
    if (DODO_WEBHOOK_SECRET.startsWith('whsec_')) {
      secretBytes = Uint8Array.from(atob(DODO_WEBHOOK_SECRET.slice(6)), c => c.charCodeAt(0))
    } else {
      secretBytes = encoder.encode(DODO_WEBHOOK_SECRET)
    }
    const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign))
    const computedB64 = btoa(String.fromCharCode(...new Uint8Array(mac)))
    const expected = `v1,${computedB64}`
    const valid = msgSignature.split(' ').some(sig => sig === expected)
    if (!valid) console.error('Signature mismatch — computed:', expected, 'received:', msgSignature)
    return valid
  } catch (err) {
    console.error('Signature error:', err)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200 })

  try {
    const rawBody = await req.text()
    if (!rawBody) return new Response(JSON.stringify({ received: true }), { status: 200 })

    if (SKIP_SIG_VERIFY) {
      console.warn('DODO_SKIP_SIG_VERIFY=true — skipping signature check')
    } else {
      const isValid = await verifyWebhookSignature(rawBody, req.headers)
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
      }
    }

    const event = JSON.parse(rawBody)
    const { type, data } = event
    console.log(`Dodo webhook received: ${type}`, JSON.stringify(data))

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
    return new Response(JSON.stringify({ received: true, error: error.message }), { status: 200 })
  }
})

// Find pending Dodo subscription by the customer email stored at checkout time.
// This avoids needing supabase.auth.admin.getUserByEmail which is not available in this runtime.
async function findPendingSubscription(customerEmail: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('payer_email', customerEmail)
    .eq('provider', 'dodo')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) console.error('findPendingSubscription error:', error)
  return data
}

async function handleSubscriptionActive(data: any) {
  console.log('handleSubscriptionActive data:', JSON.stringify(data))

  const dodoSubscriptionId = data.subscription_id
  const customerEmail = data.customer?.email ?? data.customer_email ?? data.email

  if (!customerEmail || !dodoSubscriptionId) {
    console.error('subscription.active: missing subscription_id or customer email', data)
    return
  }

  const subscription = await findPendingSubscription(customerEmail)
  if (!subscription) {
    console.error('subscription.active: no pending Dodo subscription for email:', customerEmail)
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
      dodo_customer_id: data.customer?.customer_id ?? data.customer_id ?? null,
      start_date: now.toISOString(),
      current_period_end: periodEnd,
      updated_at: now.toISOString(),
    })
    .eq('id', subscription.id)

  // Cancel any other active subscriptions for this user
  const { data: otherSubs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', subscription.user_id)
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

  const { error: upsertErr } = await supabase.from('user_plans').upsert({
    user_id: subscription.user_id,
    plan_type: subscription.plan_type,
    updated_at: now.toISOString(),
  }, { onConflict: 'user_id' })

  if (upsertErr) {
    console.error('user_plans upsert failed:', upsertErr)
  } else {
    console.log('user_plans upserted — user:', subscription.user_id, 'plan:', subscription.plan_type)
  }

  await generateInvoiceForDodo(subscription)

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: 'subscription_activated',
    dodo_event_id: dodoSubscriptionId,
    event_data: data,
  })

  console.log('subscription.active: done for user:', subscription.user_id)
}

async function handlePaymentSucceeded(data: any) {
  console.log('handlePaymentSucceeded data:', JSON.stringify(data))

  const dodoSubscriptionId = data.subscription_id
  const dodoPaymentId = data.payment_id ?? data.id
  const customerEmail = data.customer?.email ?? data.customer_email ?? data.email

  if (!dodoPaymentId) return

  // Check if subscription already activated by subscription.active event
  let { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .maybeSingle()

  // subscription.active hasn't fired yet (or won't) — activate now using payer_email
  if (!subscription && customerEmail) {
    console.log('payment.succeeded: subscription.active not yet received, activating via payer_email')
    const pending = await findPendingSubscription(customerEmail)
    if (pending) {
      const now = new Date()
      await supabase.from('subscriptions').update({
        status: 'active',
        dodo_subscription_id: dodoSubscriptionId,
        dodo_payment_id: dodoPaymentId,
        dodo_customer_id: data.customer?.customer_id ?? null,
        start_date: now.toISOString(),
        current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: now.toISOString(),
      }).eq('id', pending.id)

      const { error: upsertErr } = await supabase.from('user_plans').upsert({
        user_id: pending.user_id,
        plan_type: pending.plan_type,
        updated_at: now.toISOString(),
      }, { onConflict: 'user_id' })

      if (upsertErr) {
        console.error('user_plans upsert failed:', upsertErr)
      } else {
        console.log('user_plans activated — user:', pending.user_id, 'plan:', pending.plan_type)
      }

      await generateInvoiceForDodo({ ...pending, dodo_subscription_id: dodoSubscriptionId })

      await supabase.from('subscription_events').insert({
        subscription_id: pending.id,
        event_type: 'subscription_activated',
        dodo_event_id: dodoPaymentId,
        event_data: data,
      })
      return
    }
    console.error('payment.succeeded: no pending subscription found for email:', customerEmail)
    return
  }

  if (!subscription) return

  // Subscription already active — just store the payment ID
  await supabase
    .from('subscriptions')
    .update({ dodo_payment_id: dodoPaymentId, updated_at: new Date().toISOString() })
    .eq('id', subscription.id)

  const { data: latestInvoice } = await supabase
    .from('invoices')
    .select('id')
    .eq('subscription_id', subscription.id)
    .is('dodo_payment_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestInvoice) {
    await supabase.from('invoices').update({ dodo_payment_id: dodoPaymentId }).eq('id', latestInvoice.id)
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

  let { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .maybeSingle()

  // Fallback: subscription.active was missed — find by email
  if (!subscription) {
    console.warn('subscription.renewed: not found by dodo_subscription_id, trying email fallback')
    const customerEmail = data.customer?.email ?? data.customer_email ?? data.email
    if (customerEmail) {
      const pending = await findPendingSubscription(customerEmail)
      if (pending) {
        await supabase.from('subscriptions').update({
          status: 'active',
          dodo_subscription_id: dodoSubscriptionId,
          updated_at: new Date().toISOString(),
        }).eq('id', pending.id)
        await supabase.from('user_plans').upsert({
          user_id: pending.user_id,
          plan_type: pending.plan_type,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        subscription = { ...pending, dodo_subscription_id: dodoSubscriptionId }
      }
    }
  }

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
    .update({ status: 'active', current_period_end: newPeriodEnd, updated_at: now.toISOString() })
    .eq('id', subscription.id)

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
    .maybeSingle()

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
  const customerEmail = data.customer?.email ?? data.customer_email ?? data.email

  let subscriptionId: string | null = null

  if (dodoSubscriptionId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('dodo_subscription_id', dodoSubscriptionId)
      .maybeSingle()
    if (sub) subscriptionId = sub.id
  }

  if (!subscriptionId && customerEmail) {
    const pending = await findPendingSubscription(customerEmail)
    if (pending) subscriptionId = pending.id
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
    .maybeSingle()

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
      .eq('interval', subscription.billing_interval ?? 'month')
      .eq('is_active', true)
      .maybeSingle()

    if (!billingPlan?.price_cents) {
      console.error('No active Dodo billing plan for:', subscription.plan_type)
      return
    }

    const now = new Date()
    await supabase.functions.invoke('generate-invoice', {
      body: {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        payment_method: 'dodo',
        transaction_id: subscription.dodo_subscription_id,
        amount_cents: billingPlan.price_cents,
        plan_type: subscription.plan_type,
        billing_period_start: now.toISOString(),
        billing_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }
    })
  } catch (err) {
    console.error('Failed to generate Dodo invoice:', err)
  }
}
