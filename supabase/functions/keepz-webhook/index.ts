import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createDecipheriv } from "node:crypto"
import { Buffer } from "node:buffer"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KEEPZ_PRIVATE_KEY = Deno.env.get('KEEPZ_PRIVATE_KEY') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function decryptFromKeepz(encryptedDataB64: string, encryptedKeysB64: string): Promise<any> {
  const rsaPrivateKey = await crypto.subtle.importKey(
    'pkcs8',
    b64ToArrayBuffer(KEEPZ_PRIVATE_KEY),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  )

  const decryptedKeysBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    b64ToArrayBuffer(encryptedKeysB64)
  )

  const decryptedConcat = new TextDecoder().decode(decryptedKeysBuffer)
  const [encodedKey, encodedIV] = decryptedConcat.split('.')
  const aesKey = Buffer.from(encodedKey, 'base64')
  const iv = Buffer.from(encodedIV, 'base64')

  const decipher = createDecipheriv('aes-256-cbc', aesKey, iv)
  const decryptedData = Buffer.concat([
    decipher.update(Buffer.from(encryptedDataB64, 'base64')),
    decipher.final()
  ])

  return JSON.parse(decryptedData.toString('utf8'))
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    
    if (req.method === "GET") {
      const url = new URL(req.url)
    }

    const rawBody = await req.text()
    
    if (!rawBody || rawBody.trim() === '') {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }
    
    let body
    try {
      body = JSON.parse(rawBody)
    } catch {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    const { encryptedData, encryptedKeys } = body

    if (!encryptedData || !encryptedKeys) {
      return await handlePlainCallback(body)
    }

    const callbackData = await decryptFromKeepz(encryptedData, encryptedKeys)
    return await handleCallback(callbackData)

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message || "Webhook processing failed" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})

async function generateInvoiceForKeepzPayment(subscription: any, integratorOrderId: string) {
  try {
    const { data: billingPlan } = await supabase
      .from('billing_plans')
      .select('price_cents')
      .eq('plan_type', subscription.plan_type)
      .eq('provider', 'keepz')
      .eq('is_active', true)
      .single()

    const plan = billingPlan || (await supabase
      .from('billing_plans')
      .select('price_cents')
      .eq('plan_type', subscription.plan_type)
      .eq('provider', 'paypal')
      .eq('is_active', true)
      .single()).data

    if (!plan?.price_cents) {
      console.error('No billing plan found for Keepz invoice:', subscription.plan_type)
      return
    }

    const billingPeriodStart = new Date()
    const billingPeriodEnd = new Date()
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1)

    await supabase.functions.invoke('generate-invoice', {
      body: {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        payment_method: 'keepz',
        transaction_id: integratorOrderId,
        amount_cents: plan.price_cents,
        plan_type: subscription.plan_type,
        billing_period_start: billingPeriodStart.toISOString(),
        billing_period_end: billingPeriodEnd.toISOString()
      }
    })
    console.log('Invoice generated for Keepz payment:', integratorOrderId)
  } catch (err) {
    console.error('Failed to generate invoice for Keepz payment:', err)
  }
}

async function handlePlainCallback(data: any) {
  const { integratorOrderId, status, orderId, subscriptionId } = data

  if (!integratorOrderId) {
    return new Response(JSON.stringify({ error: "Missing integratorOrderId" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  const { data: pendingCard, error: pendingErr } = await supabase
    .from("user_payment_methods")
    .select("*")
    .eq("card_token", integratorOrderId)
    .eq("card_mask", "pending")
    .single()

  if (pendingCard && !pendingErr) {
    return await handleCardSaveCallback(data, pendingCard)
  }

  const { data: subscription, error: findErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("keepz_order_id", integratorOrderId)
    .single()

  if (findErr || !subscription) {
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  let newStatus = subscription.status
  if (status === "COMPLETED" || status === "SUCCESS" || status === "ACTIVE") {
    newStatus = "active"
  } else if (status === "FAILED" || status === "DECLINED") {
    newStatus = "failed"
  } else if (status === "CANCELLED" || status === "REVOKED") {
    newStatus = "cancelled"
  }

  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update({
      status: newStatus,
      keepz_subscription_id: subscriptionId || subscription.keepz_subscription_id,
      provider_subscription_id: orderId || subscription.provider_subscription_id,
      updated_at: new Date().toISOString()
    })
    .eq("id", subscription.id)

  if (updateErr) throw updateErr

  if (newStatus === 'active' && subscription.status !== 'active') {
    await generateInvoiceForKeepzPayment(subscription, integratorOrderId)
  }

  await supabase
    .from("subscription_events")
    .insert({
      subscription_id: subscription.id,
      event_type: `keepz_${status?.toLowerCase() || 'callback'}`,
      keepz_event_id: orderId || integratorOrderId,
      event_data: data
    })

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" }
  })
}

async function handleCallback(data: any) {
  const { 
    integratorOrderId, 
    status, 
    orderId, 
    subscriptionId,
    cardToken,
  } = data

  if (!integratorOrderId) {
    return new Response(JSON.stringify({ error: "Missing integratorOrderId" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  const { data: pendingCard, error: pendingErr } = await supabase
    .from("user_payment_methods")
    .select("*")
    .eq("card_token", integratorOrderId)
    .eq("card_mask", "pending")
    .single()

  if (pendingCard && !pendingErr) {
    return await handleCardSaveCallback(data, pendingCard)
  }

  const { data: subscription, error: findErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("keepz_order_id", integratorOrderId)
    .single()

  if (findErr || !subscription) {
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  let newStatus = subscription.status
  if (status === "COMPLETED" || status === "SUCCESS" || status === "ACTIVE") {
    newStatus = "active"
  } else if (status === "FAILED" || status === "DECLINED") {
    newStatus = "failed"
  } else if (status === "CANCELLED" || status === "REVOKED") {
    newStatus = "cancelled"
  }

  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString()
  }

  if (subscriptionId) updateData.keepz_subscription_id = subscriptionId
  if (orderId) updateData.provider_subscription_id = orderId
  if (cardToken) updateData.keepz_card_token = cardToken

  if (newStatus === "active" && subscription.status !== "active") {
    updateData.current_period_start = new Date().toISOString()
    const isWeekly = subscription.plan_type?.includes('weekly') || subscription.plan_type?.includes('week')
    const periodDays = isWeekly ? 7 : 30
    updateData.current_period_end = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString()
  }

  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update(updateData)
    .eq("id", subscription.id)

  if (updateErr) throw updateErr

  if (newStatus === "active") {
    const { data: otherSubs } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', subscription.user_id)
      .eq('status', 'active')
      .neq('id', subscription.id)

    if (otherSubs && otherSubs.length > 0) {
      for (const oldSub of otherSubs) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', oldSub.id)
      }
    }

    await supabase
      .from('user_plans')
      .upsert({
        user_id: subscription.user_id,
        plan_type: subscription.plan_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    await generateInvoiceForKeepzPayment(subscription, integratorOrderId)
  }

  await supabase
    .from("subscription_events")
    .insert({
      subscription_id: subscription.id,
      event_type: `keepz_${status?.toLowerCase() || 'callback'}`,
      keepz_event_id: orderId || integratorOrderId,
      event_data: data
    })

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" }
  })
}

async function handleCardSaveCallback(data: any, pendingCard: any) {
  const { 
    status, 
    cardInfo,
    cardToken,
    card,
    token,
    savedCardToken
  } = data

  const isSuccess = status === "SUCCESS" || status === "COMPLETED" || status === "ACTIVE" || status === "PAID"
  
  if (isSuccess) {
    const actualCardToken = cardInfo?.token || cardToken || savedCardToken || token || card?.token
    const cardMask = cardInfo?.cardMask || cardInfo?.maskedPan || card?.cardMask || card?.maskedPan || data.maskedPan
    const cardBrand = cardInfo?.cardBrand || cardInfo?.brand || card?.cardBrand || card?.brand || data.cardBrand

    if (!actualCardToken) {
      return new Response(JSON.stringify({ success: true, warning: "No card token received yet" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    const { error: updateErr } = await supabase
      .from("user_payment_methods")
      .update({
        card_token: actualCardToken,
        card_mask: cardMask || "Card saved",
        card_brand: cardBrand || "Unknown",
        last_4_digits: cardMask ? cardMask.slice(-4) : null,
        expiration_date: cardInfo?.expirationDate || card?.expirationDate || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", pendingCard.id)

    if (updateErr) throw updateErr

    const { data: allCards } = await supabase
      .from("user_payment_methods")
      .select("id")
      .eq("user_id", pendingCard.user_id)
      .neq("card_mask", "pending")

    if (allCards && allCards.length === 1) {
      await supabase
        .from("user_payment_methods")
        .update({ is_default: true })
        .eq("id", pendingCard.id)
    }
    
    return new Response(JSON.stringify({ success: true, card_saved: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } else {
    await supabase
      .from("user_payment_methods")
      .delete()
      .eq("id", pendingCard.id)

    return new Response(JSON.stringify({ success: false, status }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
}
