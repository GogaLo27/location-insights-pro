import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publicEncrypt, privateDecrypt, createCipheriv, createDecipheriv, randomBytes, constants } from "node:crypto"
import { Buffer } from "node:buffer"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

// Keepz configuration
const KEEPZ_BASE_URL = Deno.env.get('KEEPZ_MODE') === 'live' 
  ? 'https://gateway.keepz.me/ecommerce-service'
  : 'https://gateway.dev.keepz.me/ecommerce-service'

const KEEPZ_INTEGRATOR_ID = Deno.env.get('KEEPZ_INTEGRATOR_ID') ?? '7609ba19-0e88-49a8-b85f-28c41eea103f'
const KEEPZ_RECEIVER_ID = Deno.env.get('KEEPZ_RECEIVER_ID') ?? 'fb84a475-eb57-4d07-967b-73073d4a5b30'
const KEEPZ_PUBLIC_KEY = Deno.env.get('KEEPZ_PUBLIC_KEY') ?? ''
const KEEPZ_PRIVATE_KEY = Deno.env.get('KEEPZ_PRIVATE_KEY') ?? ''

// Keepz encryption class - Using Node.js crypto for PKCS1 padding support
class KeepzCrypto {
  private rsaPublicKey: string
  private rsaPrivateKey: string
  private paddingMode: 'PKCS1' | 'OAEP'

  constructor(rsaPublicKey: string, rsaPrivateKey: string, paddingMode: 'PKCS1' | 'OAEP' = 'OAEP') {
    this.rsaPublicKey = rsaPublicKey
    this.rsaPrivateKey = rsaPrivateKey
    this.paddingMode = paddingMode
  }

  encrypt(data: object): { encryptedData: string; encryptedKeys: string } {
    // 1. Generate AES-256 key and IV
    const aesKey = randomBytes(32) // 256-bit key
    const iv = randomBytes(16) // 128-bit IV

    // 2. Encrypt data with AES-256-CBC
    const cipher = createCipheriv('aes-256-cbc', aesKey, iv)
    const encryptedData = Buffer.concat([
      cipher.update(Buffer.from(JSON.stringify(data), 'utf8')),
      cipher.final()
    ])

    // 3. Prepare the key concatenation (Base64Key.Base64IV)
    const encodedKey = aesKey.toString('base64')
    const encodedIV = iv.toString('base64')
    const concat = `${encodedKey}.${encodedIV}`

    // 4. Create RSA public key PEM from Base64 DER
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${this.rsaPublicKey.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`

    // 5. Encrypt the concat with RSA
    let encryptedKeys: Buffer
    if (this.paddingMode === 'PKCS1') {
      encryptedKeys = publicEncrypt(
        {
          key: publicKeyPem,
          padding: constants.RSA_PKCS1_PADDING
        },
        Buffer.from(concat, 'utf8')
      )
    } else {
      encryptedKeys = publicEncrypt(
        {
          key: publicKeyPem,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        Buffer.from(concat, 'utf8')
      )
    }

    return {
      encryptedData: encryptedData.toString('base64'),
      encryptedKeys: encryptedKeys.toString('base64'),
    }
  }

  decrypt(encryptedDataB64: string, encryptedKeysB64: string): object {
    // 1. Create RSA private key PEM from Base64
    const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${this.rsaPrivateKey.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`

    // 2. Decrypt the encryptedKeys with RSA
    let decryptedConcat: Buffer
    if (this.paddingMode === 'PKCS1') {
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
}

// Prices are fetched from billing_plans table - no hardcoding!

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
      return_url, 
      cancel_url,
      // Campaign tracking parameters
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

    // Fetch price from billing_plans table (try keepz first, then paypal)
    let billingPlan = null
    
    // Try to get Keepz-specific plan first
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
      // Fallback to PayPal plan pricing
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

    // Convert cents to currency units (billing_plans stores in cents)
    const price = billingPlan.price_cents / 100
    console.log(`Using price from database: ${price} ${billingPlan.currency} for ${plan_type}`)

    // Validate Keepz configuration
    if (!KEEPZ_PUBLIC_KEY || !KEEPZ_PRIVATE_KEY) {
      throw new Error("Keepz configuration missing - public/private keys not set")
    }

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
        payment_method: "keepz",
        keepz_order_id: integratorOrderId,
        refund_eligible_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        // Campaign tracking data
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

    // Build Keepz order payload for SUBSCRIPTION
    // Per Keepz docs: amount must be 0 and saveCard must be true when using subscriptionPlan
    const orderPayload = {
      amount: 0, // Must be 0 for subscriptions - recurring amount is in subscriptionPlan
      receiverId: KEEPZ_RECEIVER_ID,
      receiverType: "BRANCH",
      integratorId: KEEPZ_INTEGRATOR_ID,
      integratorOrderId: integratorOrderId,
      currency: "GEL",
      saveCard: true, // Required for subscriptions
      subscriptionPlan: {
        interval: "MONTHLY",
        intervalCount: 1,
        amount: price, // Recurring subscription amount
      },
      successRedirectUri: return_url || `${req.headers.get('origin')}/billing-success`,
      failRedirectUri: cancel_url || `${req.headers.get('origin')}/checkout`,
      callbackUri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/keepz-webhook`,
      language: "EN",
    }

    console.log("Creating Keepz order with payload:", JSON.stringify(orderPayload, null, 2))
    console.log("Using Keepz Base URL:", KEEPZ_BASE_URL)
    console.log("Integrator ID:", KEEPZ_INTEGRATOR_ID)
    console.log("Public key starts with:", KEEPZ_PUBLIC_KEY.substring(0, 30) + "...")
    console.log("Public key length:", KEEPZ_PUBLIC_KEY.length)

    // Try PKCS1 padding first, then OAEP if that fails
    const paddingModes: Array<'PKCS1' | 'OAEP'> = ['PKCS1', 'OAEP']
    let lastError: Error | null = null
    
    for (const paddingMode of paddingModes) {
      console.log(`Trying encryption with ${paddingMode} padding...`)
      
      const keepzCrypto = new KeepzCrypto(KEEPZ_PUBLIC_KEY, KEEPZ_PRIVATE_KEY, paddingMode)
      
      let encrypted
      try {
        encrypted = keepzCrypto.encrypt(orderPayload)
        console.log(`Encryption successful with ${paddingMode}`)
        console.log("Encrypted data length:", encrypted.encryptedData.length)
        console.log("Encrypted keys length:", encrypted.encryptedKeys.length)
      } catch (encryptError) {
        console.error(`Encryption failed with ${paddingMode}:`, encryptError)
        lastError = encryptError as Error
        continue
      }

      // Send request to Keepz
      const keepzResponse = await fetch(`${KEEPZ_BASE_URL}/api/integrator/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: KEEPZ_INTEGRATOR_ID,
          encryptedData: encrypted.encryptedData,
          encryptedKeys: encrypted.encryptedKeys,
          aes: true,
        }),
      })

      const responseText = await keepzResponse.text()
      console.log(`Keepz response status with ${paddingMode}:`, keepzResponse.status)
      console.log("Keepz response:", responseText)

      // Check if it's a decryption error - if so, try next padding mode
      if (responseText.includes('Failed to decrypt') || responseText.includes('6010')) {
        console.log(`${paddingMode} padding failed, trying next...`)
        lastError = new Error(`Keepz could not decrypt with ${paddingMode} padding`)
        continue
      }

      if (!keepzResponse.ok) {
        let errorData
        try {
          errorData = JSON.parse(responseText)
        } catch {
          errorData = { message: responseText }
        }
        throw new Error(`Keepz API error: ${errorData.message || responseText}`)
      }

      // Parse and decrypt the response
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch {
        throw new Error(`Failed to parse Keepz response: ${responseText}`)
      }

      // Decrypt the response to get the checkout URL
      let decryptedResponse
      try {
        decryptedResponse = keepzCrypto.decrypt(
          responseData.encryptedData,
          responseData.encryptedKeys
        )
      } catch (decryptError) {
        console.error("Error decrypting Keepz response:", decryptError)
        throw new Error("Failed to decrypt Keepz response")
      }

      console.log("Decrypted Keepz response:", decryptedResponse)

      const checkoutUrl = (decryptedResponse as any).urlForQR
      if (!checkoutUrl) {
        throw new Error("No checkout URL returned from Keepz")
      }

      // Log subscription creation event
      await supabase
        .from("subscription_events")
        .insert({
          subscription_id: sub.id,
          event_type: "subscription_created",
          keepz_event_id: integratorOrderId,
          event_data: {
            plan_type: plan_type,
            keepz_order_id: integratorOrderId,
            created_at: new Date().toISOString(),
            provider: "keepz",
            padding_mode: paddingMode
          }
        })

      return new Response(JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        subscription_id: sub.id,
        keepz_order_id: integratorOrderId
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    // If we get here, both padding modes failed
    throw lastError || new Error("All encryption methods failed")

  } catch (error) {
    console.error("Error creating Keepz subscription:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})

