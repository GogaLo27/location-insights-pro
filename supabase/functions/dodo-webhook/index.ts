import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DODO_WEBHOOK_SECRET = Deno.env.get('DODO_WEBHOOK_SECRET') ?? ''
// Set DODO_SKIP_SIG_VERIFY=true in Supabase secrets to bypass signature check during debugging
const SKIP_SIG_VERIFY = Deno.env.get('DODO_SKIP_SIG_VERIFY') === 'true'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// Dodo uses Svix for webhook delivery.
// Signed message = "${webhook-id}.${webhook-timestamp}.${rawBody}"
// Secret format: "whsec_<base64>" or plain string
async function verifyWebhookSignature(rawBody: string, headers: Headers): Promise<boolean> {
  if (!DODO_WEBHOOK_SECRET) {
    console.warn('DODO_WEBHOOK_SECRET not set — skipping signature verification')
    return true
  }

  const msgId = headers.get('webhook-id')
  const msgTimestamp = headers.get('webhook-timestamp')
  const msgSignature = headers.get('webhook-signature')

  if (!msgId || !msgTimestamp || !msgSignature) {
    console.error('Missing Svix webhook headers', { msgId, msgTimestamp, msgSignature })
    return false
  }

  // Reject if timestamp is more than 5 minutes old (replay attack prevention)
  const timestampMs = parseInt(msgTimestamp) * 1000
  if (Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    console.error('Webhook timestamp too old:', msgTimestamp)
    return false
  }

  try {
    const toSign = `${msgId}.${msgTimestamp}.${rawBody}`
    const encoder = new TextEncoder()

    // Secret may be "whsec_<base64>" (Svix format) or a plain string
    let secretBytes: Uint8Array
    if (DODO_WEBHOOK_SECRET.startsWith('whsec_')) {
      const b64 = DODO_WEBHOOK_SECRET.slice(6)
      secretBytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    } else {
      secretBytes = encoder.encode(DODO_WEBHOOK_SECRET)
    }

    const key = await crypto.subtle.importKey(
      'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign))
    const computedB64 = btoa(String.fromCharCode(...new Uint8Array(mac)))
    const expected = `v1,${computedB64}`

    // Svix may send multiple space-separated signatures during rotation
    const valid = msgSignature.split(' ').some(sig => sig === expected)
    if (!valid) {
      console.error('Signature mismatch — computed:', expected, 'received:', msgSignature)
    }
    return valid
  } catch (err) {
    console.error('Signature verification error:', err)
    return false
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200 })

  try {
    const rawBody = await req.text()
    if (!rawBody) return new Response(JSON.stringify({ received: true }), { status: 200 })

    // Log all incoming headers for debugging
    const allHeaders: Record<string, string> = {}
    req.headers.forEach((v, k) => { allHeaders[k] = v })
    console.log('Webhook headers:', JSON.stringify(allHeaders))
    console.log('Webhook raw body length:', rawBody.length)

    if (SKIP_SIG_VERIFY) {
      console.warn('DODO_SKIP_SIG_VERIFY=true — skipping signature check')
    } else {
      const isValid = await verifyWebhookSignature(rawBody, req.headers)
      if (!isValid) {
        console.error('Signature validation failed — set DODO_SKIP_SIG_VERIFY=true in secrets to bypass for debugging')
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
    // Always return 200 so Dodo doesn't retry on our processing errors
    return new Response(JSON.stringify({ received: true, error: error.message }), { status: 200 })
  }
})

async function handleSubscriptionActive(data: any) {
  console.log('handleSubscriptionActive data:', JSON.stringify(data))

  const dodoSubscriptionId = data.subscription_id
  // Dodo may nest email under customer.email or put it at the top level
  const customerEmail = data.customer?.email ?? data.customer_email ?? data.email

  if (!customerEmail || !dodoSubscriptionId) {
    console.error('subscription.active: missing subscription_id or customer email', data)
    return
  }

  const { data: { user }, error: userErr } = await supabase.auth.admin.getUserByEmail(customerEmail)
  if (userErr || !user) {
    console.error('subscription.active: user not found for email:', customerEmail, userErr)
    return
  }

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
    console.error('subscription.active: no pending Dodo subscription for user:', user.id, subErr)
    return
  }

  const now = new Date()
  const periodEnd = data.current_period_end
    ?? data.next_billing_at
    ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const dodoCustomerId = data.customer?.customer_id ?? data.customer_id ?? null

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      dodo_subscription_id: dodoSubscriptionId,
      dodo_customer_id: dodoCustomerId,
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

  const { error: upsertErr } = await supabase.from('user_plans').upsert({
    user_id: user.id,
    plan_type: subscription.plan_type,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: 'user_id' })

  if (upsertErr) {
    console.error('user_plans upsert failed:', upsertErr)
  } else {
    console.log('user_plans upserted for user:', user.id, 'plan:', subscription.plan_type)
  }

  await generateInvoiceForDodo(subscription)

  await supabase.from('subscription_events').insert({
    subscription_id: subscription.id,
    event_type: 'subscription_activated',
    dodo_event_id: dodoSubscriptionId,
    event_data: data,
  })

  console.log('subscription.active: completed for user:', user.id)
}

async function handlePaymentSucceeded(data: any) {
  console.log('handlePaymentSucceeded data:', JSON.stringify(data))

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

  let { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('dodo_subscription_id', dodoSubscriptionId)
    .maybeSingle()

  // Fallback: subscription.active was missed — try to find pending sub by customer email
  if (!subscription) {
    console.warn('subscription.renewed: not found by dodo_subscription_id, trying email fallback')
    const customerEmail = data.customer?.email ?? data.customer_email ?? data.email
    if (customerEmail) {
      const { data: { user } } = await supabase.auth.admin.getUserByEmail(customerEmail)
      if (user) {
        const { data: pendingSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'dodo')
          .in('status', ['pending', 'active'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (pendingSub) {
          // Activate it now if it was still pending
          if (pendingSub.status === 'pending') {
            await supabase.from('subscriptions').update({
              status: 'active',
              dodo_subscription_id: dodoSubscriptionId,
              updated_at: new Date().toISOString(),
            }).eq('id', pendingSub.id)
            await supabase.from('user_plans').upsert({
              user_id: user.id,
              plan_type: pendingSub.plan_type,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
          } else {
            // Already active but missing dodo_subscription_id
            await supabase.from('subscriptions').update({
              dodo_subscription_id: dodoSubscriptionId,
              updated_at: new Date().toISOString(),
            }).eq('id', pendingSub.id)
          }
          subscription = { ...pendingSub, dodo_subscription_id: dodoSubscriptionId }
        }
      }
    }
    if (!subscription) {
      console.error('subscription.renewed: subscription not found:', dodoSubscriptionId)
      return
    }
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
  const customerEmail = data.customer?.email ?? data.customer_email ?? data.email

  let subscriptionId: string | null = null

  if (dodoSubscriptionId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('dodo_subscription_id', dodoSubscriptionId)
      .single()
    if (sub) subscriptionId = sub.id
  }

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
