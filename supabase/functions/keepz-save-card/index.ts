import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publicEncrypt, createCipheriv, randomBytes, constants } from "node:crypto"
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

// Encryption class for Keepz API
class KeepzCrypto {
  private rsaPublicKey: string
  private paddingMode: 'PKCS1' | 'OAEP'

  constructor(rsaPublicKey: string, paddingMode: 'PKCS1' | 'OAEP' = 'PKCS1') {
    this.rsaPublicKey = rsaPublicKey
    this.paddingMode = paddingMode
  }

  encrypt(data: object): { encryptedData: string; encryptedKeys: string } {
    // Generate AES key and IV
    const aesKey = randomBytes(32)
    const iv = randomBytes(16)

    // Encrypt data with AES-256-CBC
    const cipher = createCipheriv('aes-256-cbc', aesKey, iv)
    const encryptedData = Buffer.concat([
      cipher.update(Buffer.from(JSON.stringify(data), 'utf8')),
      cipher.final()
    ])

    // Prepare key concatenation
    const encodedKey = aesKey.toString('base64')
    const encodedIV = iv.toString('base64')
    const concat = `${encodedKey}.${encodedIV}`

    // Create PEM format public key
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${this.rsaPublicKey.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`

    // Encrypt with RSA
    let encryptedKeys: Buffer
    if (this.paddingMode === 'PKCS1') {
      encryptedKeys = publicEncrypt(
        { key: publicKeyPem, padding: constants.RSA_PKCS1_PADDING },
        Buffer.from(concat, 'utf8')
      )
    } else {
      encryptedKeys = publicEncrypt(
        { key: publicKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
        Buffer.from(concat, 'utf8')
      )
    }

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
    console.log("Public key starts with:", KEEPZ_PUBLIC_KEY?.substring(0, 20))

    // Try PKCS1 padding first, then OAEP
    const paddingModes: Array<'PKCS1' | 'OAEP'> = ['PKCS1', 'OAEP']
    let lastError: Error | null = null
    
    for (const paddingMode of paddingModes) {
      console.log(`\n--- Trying ${paddingMode} padding mode ---`)
      const keepzCrypto = new KeepzCrypto(KEEPZ_PUBLIC_KEY, paddingMode)
      
      let encrypted
      try {
        encrypted = keepzCrypto.encrypt(orderPayload)
        console.log(`${paddingMode} encryption succeeded`)
        console.log("Encrypted data length:", encrypted.encryptedData.length)
        console.log("Encrypted keys length:", encrypted.encryptedKeys.length)
      } catch (encryptError) {
        console.log(`${paddingMode} encryption failed:`, encryptError)
        lastError = encryptError as Error
        continue
      }

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

      // Check for error - but DON'T continue if it's a decrypt error, try other padding
      if (responseData.message && responseData.statusCode) {
        console.log(`${paddingMode} - Keepz returned error:`, responseData.message)
        lastError = new Error(`Keepz API error: ${responseData.message}`)
        continue
      }

      // Decrypt response to get payment URL
      if (responseData.encryptedData && responseData.encryptedKeys) {
        const { privateDecrypt, createDecipheriv } = await import("node:crypto")
        
        const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${KEEPZ_PRIVATE_KEY.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`
        
        let decryptedConcat
        try {
          decryptedConcat = privateDecrypt(
            { key: privateKeyPem, padding: paddingMode === 'PKCS1' ? constants.RSA_PKCS1_PADDING : constants.RSA_PKCS1_OAEP_PADDING, ...(paddingMode === 'OAEP' ? { oaepHash: 'sha256' } : {}) },
            Buffer.from(responseData.encryptedKeys, 'base64')
          ).toString('utf8')
        } catch {
          continue
        }

        const [encodedKey, encodedIV] = decryptedConcat.split('.')
        const aesKey = Buffer.from(encodedKey, 'base64')
        const iv = Buffer.from(encodedIV, 'base64')

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
    }

    throw lastError || new Error("Failed to communicate with Keepz")

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

