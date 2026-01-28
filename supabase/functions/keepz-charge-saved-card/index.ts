import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publicEncrypt, createCipheriv, randomBytes, constants, privateDecrypt, createDecipheriv, createPublicKey, createPrivateKey } from "node:crypto"
import { Buffer } from "node:buffer"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Keepz configuration
const KEEPZ_MODE = Deno.env.get('KEEPZ_MODE') || 'dev'
const KEEPZ_BASE_URL = KEEPZ_MODE === 'live' 
  ? 'https://gateway.keepz.me/ecommerce-service'
  : 'https://gateway.dev.keepz.me/ecommerce-service'

const KEEPZ_INTEGRATOR_ID = Deno.env.get('KEEPZ_INTEGRATOR_ID') ?? ''
const KEEPZ_RECEIVER_ID = Deno.env.get('KEEPZ_RECEIVER_ID') ?? ''
const KEEPZ_PUBLIC_KEY = Deno.env.get('KEEPZ_PUBLIC_KEY') ?? ''
const KEEPZ_PRIVATE_KEY = Deno.env.get('KEEPZ_PRIVATE_KEY') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// Encryption for Keepz API - uses OAEP padding only
// Keys must be Base64 DER encoded (as per Keepz documentation)
function encryptForKeepz(data: object, publicKey: string): { encryptedData: string; encryptedKeys: string } {
  // 1. Generate AES-256 key and IV
  const aesKey = randomBytes(32)
  const iv = randomBytes(16)

  // 2. Encrypt data with AES-CBC
  const cipher = createCipheriv('aes-256-cbc', aesKey, iv)
  const encryptedData = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(data), 'utf8')),
    cipher.final()
  ])

  // 3. Prepare encryptedKeys (AES key + IV)
  const encodedKey = aesKey.toString('base64')
  const encodedIV = iv.toString('base64')
  const concat = `${encodedKey}.${encodedIV}`

  // Create public key from Base64 DER format (as per Keepz documentation)
  // Keys are expected to be Base64 DER encoded
  const cleanKey = publicKey.replace(/\s/g, '')
  const rsaPublicKeyObj = createPublicKey({
    key: Buffer.from(cleanKey, 'base64'),
    format: 'der',
    type: 'spki'
  })

  // For Deno compatibility, export to PEM (but still use OAEP padding)
  const rsaPublicKey = rsaPublicKeyObj.export({ type: 'spki', format: 'pem' }) as string

  // Encrypt with OAEP padding only
  const encryptedKeys = publicEncrypt(
    {
      key: rsaPublicKey,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(concat, 'utf8')
  )

  return {
    encryptedData: encryptedData.toString('base64'),
    encryptedKeys: encryptedKeys.toString('base64'),
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    // Authenticate user
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(auth || "")
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: cors 
      })
    }

    const { 
      plan_type, 
      payment_method_id,  // UUID of saved card from user_payment_methods
      return_url, 
      cancel_url,
      // Campaign tracking
      campaign_code,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      landing_page,
      conversion_page
    } = await req.json()

    if (!plan_type) {
      throw new Error("plan_type is required")
    }

    if (!payment_method_id) {
      throw new Error("payment_method_id is required - please select a saved card")
    }

    // Verify the payment method belongs to this user
    const { data: paymentMethod, error: pmError } = await supabase
      .from("user_payment_methods")
      .select("*")
      .eq("id", payment_method_id)
      .eq("user_id", user.id)
      .single()

    if (pmError || !paymentMethod) {
      throw new Error("Payment method not found or doesn't belong to you")
    }

    if (paymentMethod.card_mask === "pending") {
      throw new Error("This card is still being processed. Please wait or try another card.")
    }

    // Fetch price from billing_plans table
    let billingPlan = null
    
    const { data: keepzPlan } = await supabase
      .from("billing_plans")
      .select("*")
      .eq("plan_type", plan_type)
      .eq("provider", "keepz")
      .eq("is_active", true)
      .single()
    
    if (keepzPlan) {
      billingPlan = keepzPlan
    } else {
      const { data: paypalPlan } = await supabase
        .from("billing_plans")
        .select("*")
        .eq("plan_type", plan_type)
        .eq("provider", "paypal")
        .eq("is_active", true)
        .single()
      
      billingPlan = paypalPlan
    }

    if (!billingPlan) {
      throw new Error(`No billing plan found for plan_type: ${plan_type}`)
    }

    const price = billingPlan.price_cents / 100

    // Generate unique order ID
    const integratorOrderId = crypto.randomUUID()

    // Create local subscription record (pending)
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .insert({ 
        user_id: user.id, 
        plan_type, 
        status: "pending",
        provider: "keepz",
        payment_method: "keepz_saved_card",
        keepz_order_id: integratorOrderId,
        keepz_card_token: paymentMethod.card_token,
        refund_eligible_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        campaign_code: campaign_code || null,
        referral_source: utm_source || null,
        referral_medium: utm_medium || null,
        referral_campaign: utm_campaign || null,
        referral_content: utm_content || null,
        referral_term: utm_term || null,
        landing_page: landing_page || null,
        conversion_page: conversion_page || null
      })
      .select("*")
      .single()

    if (subErr) {
      console.error("Error creating subscription:", subErr)
      throw subErr
    }

    // Build Keepz order payload using saved card token
    // Per documentation: cardToken is for one-time charges, NOT combined with subscriptionPlan
    // Subscriptions are created during card save, this just charges the saved card
    const orderPayload = {
      amount: price,
      receiverId: KEEPZ_RECEIVER_ID,
      receiverType: "BRANCH",
      integratorId: KEEPZ_INTEGRATOR_ID,
      integratorOrderId: integratorOrderId,
      currency: "GEL",
      cardToken: paymentMethod.card_token,
      callbackUri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/keepz-webhook`,
      language: "EN",
    }


    // Encrypt with OAEP padding only
    const encrypted = encryptForKeepz(orderPayload, KEEPZ_PUBLIC_KEY)

    const requestBody = {
      identifier: KEEPZ_INTEGRATOR_ID,
      encryptedData: encrypted.encryptedData,
      encryptedKeys: encrypted.encryptedKeys,
      aes: true
    }

    const response = await fetch(`${KEEPZ_BASE_URL}/api/integrator/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const responseText = await response.text()

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      throw new Error(`Invalid response from Keepz: ${responseText}`)
    }

    // Any error - throw it
    if (responseData.message && responseData.statusCode) {
      throw new Error(`Keepz API error: ${responseData.message}`)
    }

    // Success - decrypt response with OAEP
    if (responseData.encryptedData && responseData.encryptedKeys) {
      // Create private key from Base64 DER format (as per Keepz documentation)
      // Keys are expected to be Base64 DER encoded
      const cleanPrivateKey = KEEPZ_PRIVATE_KEY.replace(/\s/g, '')
      const rsaPrivateKeyObj = createPrivateKey({
        key: Buffer.from(cleanPrivateKey, 'base64'),
        format: 'der',
        type: 'pkcs8'
      })

      // For Deno compatibility, export to PEM (but still use OAEP padding)
      const rsaPrivateKey = rsaPrivateKeyObj.export({ type: 'pkcs8', format: 'pem' }) as string

      // Decrypt with OAEP padding only
      const decryptedConcat = privateDecrypt(
        {
          key: rsaPrivateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(responseData.encryptedKeys, 'base64')
      ).toString('utf8')

      const [encodedKey, encodedIV] = decryptedConcat.split('.')
      const aesKey = Buffer.from(encodedKey, 'base64')
      const iv = Buffer.from(encodedIV, 'base64')

      const decipher = createDecipheriv('aes-256-cbc', aesKey, iv)
      const decryptedData = Buffer.concat([
        decipher.update(Buffer.from(responseData.encryptedData, 'base64')),
        decipher.final()
      ])

      const decrypted = JSON.parse(decryptedData.toString('utf8'))

      // Payment accepted by Keepz - activate subscription NOW
      
      // 1. Activate this subscription
      const isWeekly = plan_type?.includes('weekly') || plan_type?.includes('week')
      const periodDays = isWeekly ? 7 : 30
      
      const { error: activateErr } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", sub.id)

      if (activateErr) {
        console.error("Failed to activate subscription:", activateErr)
      }

      // 2. Update user_plans
      const { error: planErr } = await supabase
        .from("user_plans")
        .upsert({
          user_id: user.id,
          plan_type: plan_type,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })

      if (planErr) {
        console.error("Failed to update user_plans:", planErr)
      }

      // 3. Cancel other active subscriptions
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .neq('id', sub.id)


      return new Response(JSON.stringify({
        success: true,
        subscription_id: sub.id,
        plan_type: plan_type,
        message: "Subscription activated"
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    throw new Error("Failed to communicate with Keepz")

  } catch (error) {
    console.error("Error charging saved card:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to process payment" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})

