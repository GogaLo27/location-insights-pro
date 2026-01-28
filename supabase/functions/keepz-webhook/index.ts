import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { privateDecrypt, createDecipheriv, constants, createPrivateKey } from "node:crypto"
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

// Helper function to convert PEM to DER or use DER directly
// Decrypt function for Keepz callbacks - uses OAEP padding only
// Keys must be Base64 DER encoded (as per Keepz documentation)
function decryptKeepzPayload(encryptedDataB64: string, encryptedKeysB64: string): object {
  // 1. Create private key from Base64 DER format (as per Keepz documentation)
  // Keys are expected to be Base64 DER encoded
  const cleanKey = KEEPZ_PRIVATE_KEY.replace(/\s/g, '')
  const rsaPrivateKeyObj = createPrivateKey({
    key: Buffer.from(cleanKey, 'base64'),
    format: 'der',
    type: 'pkcs8'
  })

  // For Deno compatibility, export to PEM (but still use OAEP padding)
  const rsaPrivateKey = rsaPrivateKeyObj.export({ type: 'pkcs8', format: 'pem' }) as string

  // 2. Decrypt the encryptedKeys with RSA using OAEP padding only
  const decryptedConcat = privateDecrypt(
    {
      key: rsaPrivateKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encryptedKeysB64, 'base64')
  )

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
    const rawBody = await req.text()
    
    // If body is empty, return success (might be a ping/health check)
    if (!rawBody || rawBody.trim() === '') {
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
      // Return 200 anyway so Keepz doesn't retry
      return new Response(JSON.stringify({ success: true, message: "Body received but not JSON" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    const { encryptedData, encryptedKeys, aes } = body

    if (!encryptedData || !encryptedKeys) {
      // Plain callback (not encrypted) - handle status update
      return await handlePlainCallback(body)
    }

    // Decrypt with OAEP padding only
    const callbackData = decryptKeepzPayload(encryptedData, encryptedKeys)

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
        for (const oldSub of otherSubs) {
          // Mark old subscription as cancelled
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'cancelled', 
              cancelled_at: new Date().toISOString(), 
              updated_at: new Date().toISOString() 
            })
            .eq('id', oldSub.id)
        }
      }
    } catch (e) {
      // Silent fail
    }

    // Update user_plans to reflect the new plan
    await supabase
      .from('user_plans')
      .upsert({
        user_id: subscription.user_id,
        plan_type: subscription.plan_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
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


  // Check if payment/card save was successful
  // Keepz might send different status values
  const isSuccess = status === "SUCCESS" || status === "COMPLETED" || status === "ACTIVE" || status === "PAID"
  
  if (isSuccess) {
    // Get actual card token from various possible fields
    const actualCardToken = cardInfo?.token || cardToken || savedCardToken || token || card?.token
    
    // Get card mask from various possible fields
    const cardMask = cardInfo?.cardMask || cardInfo?.maskedPan || card?.cardMask || card?.maskedPan || data.maskedPan
    const cardBrand = cardInfo?.cardBrand || cardInfo?.brand || card?.cardBrand || card?.brand || data.cardBrand

    if (!actualCardToken) {
      // Don't delete - keep as pending, maybe callback will come again
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
      
    }
    
    return new Response(JSON.stringify({ success: true, card_saved: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } else {
    // Card save failed - delete the pending record
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

