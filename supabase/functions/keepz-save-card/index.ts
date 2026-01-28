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
function encryptForKeepz(data: object, publicKey: string): { encryptedData: string; encryptedKeys: string; _usedPem?: boolean } {

  const aesKey = randomBytes(32)
  const iv = randomBytes(16)

  const cipher = createCipheriv('aes-256-cbc', aesKey, iv)
  const encryptedData = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(data), 'utf8')),
    cipher.final()
  ])

  const encodedKey = aesKey.toString('base64')
  const encodedIV = iv.toString('base64')
  const concat = `${encodedKey}.${encodedIV}`

  // Create public key from Base64 DER format (exactly as per Keepz documentation)
  // Keys are expected to be Base64 DER encoded
  const cleanKey = publicKey.replace(/\s/g, '')
  const rsaPublicKey = createPublicKey({
    key: Buffer.from(cleanKey, 'base64'),
    format: 'der',
    type: 'spki'
  })

  // Try using KeyObject directly first (as per Keepz example)
  // If this fails in Deno, we'll catch and try PEM export
  let encryptedKeys: Buffer
  try {
    encryptedKeys = publicEncrypt(
      {
        key: rsaPublicKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(concat, 'utf8')
    )
  } catch (keyError: any) {
    // Fallback: export to PEM if KeyObject doesn't work in Deno
    const rsaPublicKeyPem = rsaPublicKey.export({ type: 'spki', format: 'pem' }) as string
    encryptedKeys = publicEncrypt(
      {
        key: rsaPublicKeyPem,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(concat, 'utf8')
    )
  }

  return {
    encryptedData: encryptedData.toString('base64'),
    encryptedKeys: encryptedKeys.toString('base64')
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

    // Generate unique order ID
    const integratorOrderId = crypto.randomUUID()

    // Store pending card save request
    const { error: pendingError } = await supabase
      .from('user_payment_methods')
      .insert({
        user_id: user.id,
        provider: 'keepz',
        card_token: integratorOrderId, // Temporary - i need to remove this later
        nickname: nickname || null,
        card_mask: 'pending',
        card_brand: 'pending'
      })

    if (pendingError && !pendingError.message.includes('duplicate')) {
      console.error("Error creating pending card record:", pendingError)
    }

    // Build Keepz order payload
    const orderPayload = {
      amount: 0,
      receiverId: KEEPZ_RECEIVER_ID,
      receiverType: "BRANCH",
      integratorId: KEEPZ_INTEGRATOR_ID,
      integratorOrderId: integratorOrderId,
      currency: "GEL",
      saveCard: true,
      directLinkProvider: "CREDO",
      successRedirectUri: return_url || `${req.headers.get('origin')}/payment-methods?saved=true`,
      failRedirectUri: cancel_url || `${req.headers.get('origin')}/payment-methods?saved=false`,
      callbackUri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/keepz-webhook`,
      language: "EN",
    }

    // Encrypt with OAEP
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

    // Any error
    if (responseData.message && responseData.statusCode) {
      throw new Error(`Keepz API error: ${responseData.message}`)
    }

    // Success - decrypt response with OAEP
    if (responseData.encryptedData && responseData.encryptedKeys) {
      // Create private key from Base64 DER format (exactly as per Keepz documentation)
      // Keys are expected to be Base64 DER encoded
      const cleanPrivateKey = KEEPZ_PRIVATE_KEY.replace(/\s/g, '')
      const rsaPrivateKey = createPrivateKey({
        key: Buffer.from(cleanPrivateKey, 'base64'),
        format: 'der',
        type: 'pkcs8'
      })

      // Try using KeyObject directly first (as per Keepz example)
      // If this fails in Deno, we'll catch and try PEM export
      let decryptedConcat: string
      try {
        decryptedConcat = privateDecrypt(
          {
            key: rsaPrivateKey, // Use KeyObject directly
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          Buffer.from(responseData.encryptedKeys, 'base64')
        ).toString('utf8')
      } catch (keyError: any) {
        // Fallback: export to PEM if KeyObject doesn't work in Deno
        const rsaPrivateKeyPem = rsaPrivateKey.export({ type: 'pkcs8', format: 'pem' }) as string
        decryptedConcat = privateDecrypt(
          {
            key: rsaPrivateKeyPem,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          Buffer.from(responseData.encryptedKeys, 'base64')
        ).toString('utf8')
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

      return new Response(JSON.stringify({
        success: true,
        payment_url: decrypted.urlForQR,
        order_id: integratorOrderId
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    throw new Error("Failed to communicate with Keepz")

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

