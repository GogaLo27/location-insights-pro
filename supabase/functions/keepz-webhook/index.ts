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
    // Log all request details first
    console.log("=== KEEPZ WEBHOOK RECEIVED ===")
    console.log("Method:", req.method)
    console.log("URL:", req.url)
    console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
    
    // Get raw body text first
    const rawBody = await req.text()
    console.log("Raw body:", rawBody)
    console.log("Raw body length:", rawBody.length)
    
    // If body is empty, return success (might be a ping/health check)
    if (!rawBody || rawBody.trim() === '') {
      console.log("Empty body received - returning 200 OK")
      return new Response(JSON.stringify({ success: true, message: "Empty body acknowledged" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }
    
    // Try to parse as JSON
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError)
      console.log("Body content:", rawBody)
      // Return 200 anyway so Keepz doesn't retry
      return new Response(JSON.stringify({ success: true, message: "Body received but not JSON" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }
    
    console.log("Keepz webhook parsed body:", JSON.stringify(body, null, 2))

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
  const { integratorOrderId, status, orderId, subscriptionId, cardToken, cardInfo } = data

  if (!integratorOrderId) {
    return new Response(JSON.stringify({ error: "Missing integratorOrderId" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  // FIRST: Check if this is a CARD SAVE callback
  const { data: pendingCard, error: pendingErr } = await supabase
    .from("user_payment_methods")
    .select("*")
    .eq("card_token", integratorOrderId)
    .eq("card_mask", "pending")
    .single()

  if (pendingCard && !pendingErr) {
    console.log("Plain callback: This is a CARD SAVE callback")
    return await handleCardSaveCallback(data, pendingCard)
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
    cardInfo,
    amount,
    currency
  } = data

  if (!integratorOrderId) {
    return new Response(JSON.stringify({ error: "Missing integratorOrderId" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }

  // Check if this is a CARD SAVE callback (card saved without subscription)
  // We identify this by checking if there's a pending record in user_payment_methods
  const { data: pendingCard, error: pendingErr } = await supabase
    .from("user_payment_methods")
    .select("*")
    .eq("card_token", integratorOrderId) // We stored integratorOrderId as temp token
    .eq("card_mask", "pending")
    .single()

  if (pendingCard && !pendingErr) {
    console.log("This is a CARD SAVE callback, not subscription")
    return await handleCardSaveCallback(data, pendingCard)
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

  // If activating, set period dates based on plan interval
  if (newStatus === "active" && subscription.status !== "active") {
    updateData.current_period_start = new Date().toISOString()
    
    // Check if it's a weekly plan (for test_weekly)
    const isWeekly = subscription.plan_type?.includes('weekly') || subscription.plan_type?.includes('week')
    const periodDays = isWeekly ? 7 : 30
    updateData.current_period_end = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString()
  }

  const { error: updateErr } = await supabase
    .from("subscriptions")
    .update(updateData)
    .eq("id", subscription.id)

  if (updateErr) {
    console.error("Error updating subscription:", updateErr)
    throw updateErr
  }

  // If subscription became active, cancel any OTHER active subscriptions for this user (upgrade/downgrade handling)
  if (newStatus === "active") {
    try {
      const { data: otherSubs, error: listError } = await supabase
        .from('subscriptions')
        .select('id, keepz_subscription_id, provider')
        .eq('user_id', subscription.user_id)
        .eq('status', 'active')
        .neq('id', subscription.id)

      if (listError) {
        console.error('Error fetching other active subscriptions:', listError)
      } else if (otherSubs && otherSubs.length > 0) {
        console.log('Cancelling other active subscriptions for user (upgrade/downgrade):', otherSubs.map(s => s.id))
        
        for (const oldSub of otherSubs) {
          // Mark old subscription as cancelled
          const { error: markErr } = await supabase
            .from('subscriptions')
            .update({ 
              status: 'cancelled', 
              cancelled_at: new Date().toISOString(), 
              updated_at: new Date().toISOString() 
            })
            .eq('id', oldSub.id)

          if (markErr) {
            console.error('Failed to mark old subscription as cancelled:', markErr)
          } else {
            console.log(`Old subscription ${oldSub.id} cancelled due to upgrade/downgrade`)
          }
        }
      }
    } catch (e) {
      console.error('Error while auto-cancelling previous subscriptions:', e)
    }

    // Update user_plans to reflect the new plan
    const { error: planError } = await supabase
      .from('user_plans')
      .upsert({
        user_id: subscription.user_id,
        plan_type: subscription.plan_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (planError) {
      console.error('Error updating user_plans:', planError)
    } else {
      console.log(`User plan updated to ${subscription.plan_type}`)
    }
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

// Handle card save callback (when user saves card without subscription)
async function handleCardSaveCallback(data: any, pendingCard: any) {
  const { 
    integratorOrderId, 
    status, 
    cardInfo,
    cardToken,
    // Sometimes Keepz sends these at top level
    card,
    token,
    savedCardToken
  } = data

  console.log("Processing card save callback for user:", pendingCard.user_id)
  console.log("Full callback data:", JSON.stringify(data, null, 2))
  console.log("Card info received:", cardInfo)
  console.log("Card token received:", cardToken)
  console.log("Status:", status)

  // Check if payment/card save was successful
  // Keepz might send different status values
  const isSuccess = status === "SUCCESS" || status === "COMPLETED" || status === "ACTIVE" || status === "PAID"
  
  if (isSuccess) {
    // Get actual card token from various possible fields
    const actualCardToken = cardInfo?.token || cardToken || savedCardToken || token || card?.token
    
    // Get card mask from various possible fields
    const cardMask = cardInfo?.cardMask || cardInfo?.maskedPan || card?.cardMask || card?.maskedPan || data.maskedPan
    const cardBrand = cardInfo?.cardBrand || cardInfo?.brand || card?.cardBrand || card?.brand || data.cardBrand

    console.log("Extracted card token:", actualCardToken)
    console.log("Extracted card mask:", cardMask)
    console.log("Extracted card brand:", cardBrand)

    if (!actualCardToken) {
      console.error("No card token received from Keepz! Full data:", JSON.stringify(data))
      // Don't delete - keep as pending, maybe callback will come again
      // Just log and return success to Keepz
      return new Response(JSON.stringify({ success: true, warning: "No card token received yet" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    // Update the pending record with actual card details
    const { error: updateErr } = await supabase
      .from("user_payment_methods")
      .update({
        card_token: actualCardToken,  // Replace temp token with real one
        card_mask: cardMask || "Card saved",
        card_brand: cardBrand || "Unknown",
        last_4_digits: cardMask ? cardMask.slice(-4) : null,
        expiration_date: cardInfo?.expirationDate || card?.expirationDate || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", pendingCard.id)

    if (updateErr) {
      console.error("Error updating payment method:", updateErr)
      throw updateErr
    }

    // Check if this is the user's first card - make it default
    const { data: allCards } = await supabase
      .from("user_payment_methods")
      .select("id")
      .eq("user_id", pendingCard.user_id)
      .neq("card_mask", "pending")

    if (allCards && allCards.length === 1) {
      // This is the only (first) card - make it default
      await supabase
        .from("user_payment_methods")
        .update({ is_default: true })
        .eq("id", pendingCard.id)
      
      console.log("Set as default card (first card for user)")
    }

    console.log(`Card saved successfully for user ${pendingCard.user_id}`)
    
    return new Response(JSON.stringify({ success: true, card_saved: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } else {
    // Card save failed - delete the pending record
    console.log("Card save failed with status:", status)
    
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

