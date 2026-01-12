import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publicEncrypt, createCipheriv, randomBytes, constants, createPublicKey, privateDecrypt, createDecipheriv, createPrivateKey } from "node:crypto"
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

// Encryption class for Keepz API - Following exact documentation example
class KeepzCrypto {
  private rsaPublicKey: string

  constructor(rsaPublicKey: string) {
    this.rsaPublicKey = rsaPublicKey
  }

  encrypt(data: object): { encryptedData: string; encryptedKeys: string } {
    // 1. Generate AES-256 key and IV
    const aesKey = randomBytes(32) // 256-bit key
    const iv = randomBytes(16) // 128-bit IV

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

    // Create public key from DER format (Base64 encoded) - EXACTLY as documentation shows
    const rsaPublicKey = createPublicKey({
      key: Buffer.from(this.rsaPublicKey, 'base64'),
      format: 'der',
      type: 'spki',
    })

    // Encrypt with RSA OAEP padding + SHA-256 - EXACTLY as documentation shows
    const encryptedKeys = publicEncrypt(
      {
        key: rsaPublicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(concat, 'utf8')
    )

    return {
      encryptedData: encryptedData.toString('base64'),
      encryptedKeys: encryptedKeys.toString('base64'),
    }
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

    const { return_url, cancel_url, nickname } = await req.json()

    // Validate Keepz configuration
    if (!KEEPZ_PUBLIC_KEY || !KEEPZ_PRIVATE_KEY) {
      throw new Error("Keepz configuration missing")
    }

    // Generate unique order ID for this card save
    const integratorOrderId = crypto.randomUUID()

    // Store pending card save request (so webhook knows what to do)
    const { error: pendingError } = await supabase
      .from('user_payment_methods')
      .insert({
        user_id: user.id,
        provider: 'keepz',
        card_token: integratorOrderId, // Temporary - will be replaced with actual token
        nickname: nickname || null,
        card_mask: 'pending',
        card_brand: 'pending'
      })

    // If insert fails due to duplicate, that's fine - user might be retrying
    if (pendingError && !pendingError.message.includes('duplicate')) {
      console.error("Error creating pending card record:", pendingError)
    }

    // Build Keepz order payload for CARD SAVE ONLY
    // Using small amount (1 GEL) for authorization - NOT charged, just verified
    const orderPayload = {
      amount: 1, // Small authorization amount (will be voided/refunded)
      receiverId: KEEPZ_RECEIVER_ID,
      receiverType: "BRANCH",
      integratorId: KEEPZ_INTEGRATOR_ID,
      integratorOrderId: integratorOrderId,
      currency: "GEL",
      saveCard: true,
      directLinkProvider: "CREDO",
      // NO subscriptionPlan - just saving the card
      successRedirectUri: return_url || `${req.headers.get('origin')}/payment-methods?saved=true`,
      failRedirectUri: cancel_url || `${req.headers.get('origin')}/payment-methods?saved=false`,
      callbackUri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/keepz-webhook`,
      language: "EN",
    }

    console.log("Creating Keepz card save with payload:", JSON.stringify(orderPayload, null, 2))
    console.log("Using Keepz URL:", KEEPZ_BASE_URL)
    console.log("Integrator ID:", KEEPZ_INTEGRATOR_ID)
    console.log("Public key length:", KEEPZ_PUBLIC_KEY?.length || 0)

    // Encrypt using exact method from Keepz documentation
    const keepzCrypto = new KeepzCrypto(KEEPZ_PUBLIC_KEY)
    const encrypted = keepzCrypto.encrypt(orderPayload)
    
    console.log("Encryption succeeded")

    // Send to Keepz
    const requestBody = {
      identifier: KEEPZ_INTEGRATOR_ID,
      encryptedData: encrypted.encryptedData,
      encryptedKeys: encrypted.encryptedKeys,
      aes: true
    }

    console.log("Sending to Keepz API...")
    const response = await fetch(`${KEEPZ_BASE_URL}/api/integrator/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const responseText = await response.text()
    console.log("Keepz response status:", response.status)
    console.log("Keepz response:", responseText)

    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      throw new Error(`Invalid response from Keepz: ${responseText}`)
    }

    // Check for error
    if (responseData.message && responseData.statusCode) {
      throw new Error(`Keepz API error: ${responseData.message}`)
    }

    // Decrypt response to get payment URL - using exact method from documentation
    if (responseData.encryptedData && responseData.encryptedKeys) {
      const rsaPrivateKey = createPrivateKey({
        key: Buffer.from(KEEPZ_PRIVATE_KEY, 'base64'),
        format: 'der',
        type: 'pkcs8',
      })

      // Decrypt the encryptedKeys
      const decryptedConcat = privateDecrypt(
        {
          key: rsaPrivateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(responseData.encryptedKeys, 'base64')
      ).toString('utf8')

      const [encodedKey, encodedIV] = decryptedConcat.split('.')
      const aesKey = Buffer.from(encodedKey, 'base64')
      const iv = Buffer.from(encodedIV, 'base64')

      // Decrypt the encryptedData
      const decipher = createDecipheriv('aes-256-cbc', aesKey, iv)
      const decryptedData = Buffer.concat([
        decipher.update(Buffer.from(responseData.encryptedData, 'base64')),
        decipher.final()
      ])

      const decrypted = JSON.parse(decryptedData.toString('utf8'))
      console.log("Decrypted Keepz response:", decrypted)

      return new Response(JSON.stringify({
        success: true,
        payment_url: decrypted.urlForQR,
        order_id: integratorOrderId
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    throw new Error("Invalid response from Keepz - no encrypted data")

  } catch (error) {
    console.error("Error saving card:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to save card" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})

