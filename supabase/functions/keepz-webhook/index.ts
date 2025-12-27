import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { privateDecrypt, createDecipheriv, constants } from "node:crypto"
import { Buffer } from "node:buffer"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const KEEPZ_PRIVATE_KEY = Deno.env.get('KEEPZ_PRIVATE_KEY') ?? ''

// Decrypt function for Keepz callbacks
function decryptKeepzPayload(encryptedDataB64: string, encryptedKeysB64: string, paddingMode: 'PKCS1' | 'OAEP' = 'PKCS1'): object {
  // 1. Create RSA private key PEM from Base64
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${KEEPZ_PRIVATE_KEY.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`

  // 2. Decrypt the encryptedKeys with RSA
  let decryptedConcat: Buffer
  if (paddingMode === 'PKCS1') {
    decryptedConcat = privateDecrypt(
      {
        key: privateKeyPem,
        padding: constants.RSA_PKCS1_PADDING
      },
      Buffer.from(encryptedKeysB64, 'base64')
    )
  } else {
    decryptedConcat = privateDecrypt(
      {
        key: privateKeyPem,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(encryptedKeysB64, 'base64')
    )
  }

  // 3. Split to get AES key and IV
  const [encodedKey, encodedIV] = decryptedConcat.toString('utf8').split('.')
  const aesKey = Buffer.from(encodedKey, 'base64')
  const iv = Buffer.from(encodedIV, 'base64')

  // 4. Decrypt the data with AES-256-CBC
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
    const body = await req.json()
    console.log("Keepz webhook received:", JSON.stringify(body, null, 2))

    const { encryptedData, encryptedKeys, aes } = body

    if (!encryptedData || !encryptedKeys) {
      // Plain callback (not encrypted) - handle status update
      console.log("Plain callback received:", body)
      return await handlePlainCallback(body)
    }

    // Try to decrypt with PKCS1 first, then OAEP
    let callbackData: any
    try {
      callbackData = decryptKeepzPayload(encryptedData, encryptedKeys, 'PKCS1')
    } catch (e) {
      console.log("PKCS1 decryption failed, trying OAEP...")
      callbackData = decryptKeepzPayload(encryptedData, encryptedKeys, 'OAEP')
    }

    console.log("Decrypted callback data:", JSON.stringify(callbackData, null, 2))

    // Handle the callback based on status
    return await handleCallback(callbackData)

  } catch (error) {
    console.error("Error processing Keepz webhook:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Webhook processing failed" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})

async function handlePlainCallback(data: any) {
  const { integratorOrderId, status, orderId, subscriptionId } = data

  if (!integratorOrderId) {
    return new Response(JSON.stringify({ error: "Missing integratorOrderId" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  // Find subscription by keepz_order_id
  const { data: subscription, error: findErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("keepz_order_id", integratorOrderId)
    .single()

  if (findErr || !subscription) {
    console.error("Subscription not found for order:", integratorOrderId)
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  // Map Keepz status to our status
  let newStatus = subscription.status
  if (status === "COMPLETED" || status === "SUCCESS" || status === "ACTIVE") {
    newStatus = "active"
  } else if (status === "FAILED" || status === "DECLINED") {
    newStatus = "failed"
  } else if (status === "CANCELLED" || status === "REVOKED") {
    newStatus = "cancelled"
  }

  // Update subscription
  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update({
      status: newStatus,
      keepz_subscription_id: subscriptionId || subscription.keepz_subscription_id,
      provider_subscription_id: orderId || subscription.provider_subscription_id,
      updated_at: new Date().toISOString()
    })
    .eq("id", subscription.id)

  if (updateErr) {
    console.error("Error updating subscription:", updateErr)
    throw updateErr
  }

  // Log the event
  await supabase
    .from("subscription_events")
    .insert({
      subscription_id: subscription.id,
      event_type: `keepz_${status?.toLowerCase() || 'callback'}`,
      keepz_event_id: orderId || integratorOrderId,
      event_data: data
    })

  console.log(`Subscription ${subscription.id} updated to ${newStatus}`)

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
    amount,
    currency
  } = data

  if (!integratorOrderId) {
    return new Response(JSON.stringify({ error: "Missing integratorOrderId" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  // Find subscription by keepz_order_id
  const { data: subscription, error: findErr } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("keepz_order_id", integratorOrderId)
    .single()

  if (findErr || !subscription) {
    console.error("Subscription not found for order:", integratorOrderId)
    return new Response(JSON.stringify({ error: "Subscription not found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  // Map Keepz status to our status
  let newStatus = subscription.status
  if (status === "COMPLETED" || status === "SUCCESS" || status === "ACTIVE") {
    newStatus = "active"
  } else if (status === "FAILED" || status === "DECLINED") {
    newStatus = "failed"
  } else if (status === "CANCELLED" || status === "REVOKED") {
    newStatus = "cancelled"
  }

  // Update subscription
  const updateData: any = {
    status: newStatus,
    updated_at: new Date().toISOString()
  }

  if (subscriptionId) {
    updateData.keepz_subscription_id = subscriptionId
  }
  if (orderId) {
    updateData.provider_subscription_id = orderId
  }
  if (cardToken) {
    updateData.keepz_card_token = cardToken
  }

  // If activating, set period dates
  if (newStatus === "active" && subscription.status !== "active") {
    updateData.current_period_start = new Date().toISOString()
    updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 days
  }

  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update(updateData)
    .eq("id", subscription.id)

  if (updateErr) {
    console.error("Error updating subscription:", updateErr)
    throw updateErr
  }

  // Log the event
  await supabase
    .from("subscription_events")
    .insert({
      subscription_id: subscription.id,
      event_type: `keepz_${status?.toLowerCase() || 'callback'}`,
      keepz_event_id: orderId || integratorOrderId,
      event_data: data
    })

  console.log(`Subscription ${subscription.id} updated to ${newStatus}`)

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...cors, "Content-Type": "application/json" }
  })
}

