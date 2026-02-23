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

  // Deno requires PEM format for publicEncrypt - always export to PEM
  let encryptedKeys: Buffer
  let usedPemForEncryption = true
  try {
    console.log("🔐 ENCRYPTION: Exporting key to PEM format...")
    const rsaPublicKeyPem = rsaPublicKey.export({ type: 'spki', format: 'pem' }) as string
    console.log("🔐 ENCRYPTION: Encrypting with PEM key...")
    encryptedKeys = publicEncrypt(
      {
        key: rsaPublicKeyPem,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(concat, 'utf8')
    )
    console.log("✅ ENCRYPTION: Success with PEM format")
  } catch (keyError: any) {
    console.error("❌ ENCRYPTION: Failed with PEM format:", keyError.message)
    console.error("Key error details:", keyError)
    throw new Error(`Encryption failed: ${keyError.message}`)
  }

  return {
    encryptedData: encryptedData.toString('base64'),
    encryptedKeys: encryptedKeys.toString('base64'),
    _usedPem: usedPemForEncryption // Internal flag for debugging
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  // Log incoming request
  const requestId = crypto.randomUUID()
  const requestTimestamp = new Date().toISOString()
  console.log("=".repeat(80))
  console.log(`📥 INCOMING REQUEST [${requestId}] - ${requestTimestamp}`)
  console.log("=".repeat(80))
  console.log("Request Method:", req.method)
  console.log("Request URL:", req.url)
  console.log("Request Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2))
  
  // Parse request body
  let requestBody: any = null
  try {
    const bodyText = await req.text()
    if (bodyText) {
      requestBody = JSON.parse(bodyText)
    }
    console.log("Request Body:", JSON.stringify(requestBody, null, 2))
  } catch (e) {
    console.log("Request Body: (could not parse)", e)
    requestBody = null
  }
  console.log("-".repeat(80))

  try {
    // Authenticate user
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(auth || "")
    if (!user) {
      const errorResponse = { error: "Unauthorized" }
      console.log("=".repeat(80))
      console.log(`📤 OUTGOING RESPONSE [${requestId}]`)
      console.log("=".repeat(80))
      console.log("Status: 401")
      console.log("Response Body:", JSON.stringify(errorResponse, null, 2))
      console.log("=".repeat(80))
      return new Response(JSON.stringify(errorResponse), { 
        status: 401, 
        headers: cors 
      })
    }

    // Extract request parameters
    const return_url = requestBody?.return_url
    const cancel_url = requestBody?.cancel_url
    const nickname = requestBody?.nickname

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

    console.log("Creating Keepz card save with payload:", JSON.stringify(orderPayload, null, 2))
    console.log("Public key length:", KEEPZ_PUBLIC_KEY.length)
    console.log("Public key first 50 chars:", KEEPZ_PUBLIC_KEY.substring(0, 50))
    console.log("Private key length:", KEEPZ_PRIVATE_KEY.length)
    console.log("Private key first 50 chars:", KEEPZ_PRIVATE_KEY.substring(0, 50))

    // Verify keys are a matching pair by testing encryption/decryption
    try {
      console.log("🔑 KEY VERIFICATION: Testing if keys match...")
      const cleanPrivateKey = KEEPZ_PRIVATE_KEY.replace(/\s/g, '')
      const cleanPublicKey = KEEPZ_PUBLIC_KEY.replace(/\s/g, '')
      
      const privateKeyObj = createPrivateKey({
        key: Buffer.from(cleanPrivateKey, 'base64'),
        format: 'der',
        type: 'pkcs8'
      })
      const publicKeyObj = createPublicKey({
        key: Buffer.from(cleanPublicKey, 'base64'),
        format: 'der',
        type: 'spki'
      })
      
      // Test: Encrypt with public key, decrypt with private key
      const testData = "test123"
      let testEncrypted: Buffer
      try {
        const publicKeyPem = publicKeyObj.export({ type: 'spki', format: 'pem' }) as string
        testEncrypted = publicEncrypt(
          { key: publicKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
          Buffer.from(testData, 'utf8')
        )
      } catch (e: any) {
        throw new Error(`Encryption test failed: ${e.message}`)
      }
      
      let testDecrypted: string
      try {
        const privateKeyPem = privateKeyObj.export({ type: 'pkcs8', format: 'pem' }) as string
        testDecrypted = privateDecrypt(
          { key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
          testEncrypted
        ).toString('utf8')
      } catch (e: any) {
        throw new Error(`Decryption test failed: ${e.message}`)
      }
      
      const keysMatch = testDecrypted === testData
      console.log("🔑 KEY VERIFICATION RESULT:")
      console.log("Keys are matching pair:", keysMatch)
      if (!keysMatch) {
        console.error("❌ CRITICAL: Public and private keys do NOT appear to be a matching pair!")
        console.error("Expected:", testData)
        console.error("Got:", testDecrypted)
        console.error("This will cause all decryption to fail!")
      } else {
        console.log("✅ Keys are a matching pair - encryption/decryption test passed")
      }
    } catch (keyCheckError: any) {
      console.error("❌ Failed to verify key pair:", keyCheckError.message)
      console.error("This suggests the keys may not be a matching pair!")
    }

    // Encrypt with OAEP
    const encrypted = encryptForKeepz(orderPayload, KEEPZ_PUBLIC_KEY)
    
    console.log("Encrypted data length:", encrypted.encryptedData.length)
    console.log("Encrypted keys length:", encrypted.encryptedKeys.length)
    
    // Self-test: Try to decrypt what we encrypted to verify encryption works
    try {
      console.log("=== SELF-TEST START ===")
      const cleanPrivateKey = KEEPZ_PRIVATE_KEY.replace(/\s/g, '')
      console.log("Private key length:", cleanPrivateKey.length)
      console.log("Private key first 50 chars:", cleanPrivateKey.substring(0, 50))
      
      const rsaPrivateKey = createPrivateKey({
        key: Buffer.from(cleanPrivateKey, 'base64'),
        format: 'der',
        type: 'pkcs8'
      })
      console.log("✅ Private key created successfully")
      
      let decryptedTest: string
      let usedPem = false
      // Use same method as encryption (check if encryption used PEM)
      const encryptionUsedPem = (encrypted as any)._usedPem || false
      console.log("Encryption used PEM:", encryptionUsedPem)
      
      // Try multiple approaches to find what works
      let decryptionSuccess = false
      
      // Approach 1: Try KeyObject directly (even if encryption used PEM, sometimes this works)
      if (!decryptionSuccess) {
        try {
          console.log("🔓 DECRYPTION: Attempt 1 - Trying KeyObject directly...")
          decryptedTest = privateDecrypt(
            { key: rsaPrivateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
            Buffer.from(encrypted.encryptedKeys, 'base64')
          ).toString('utf8')
          console.log("✅ DECRYPTION: Success with KeyObject directly")
          decryptionSuccess = true
        } catch (keyError: any) {
          console.log("❌ DECRYPTION: KeyObject direct failed:", keyError.message)
        }
      }
      
      // Approach 2: Try PEM export
      if (!decryptionSuccess) {
        try {
          console.log("🔓 DECRYPTION: Attempt 2 - Trying PEM export...")
          const rsaPrivateKeyPem = rsaPrivateKey.export({ type: 'pkcs8', format: 'pem' }) as string
          usedPem = true
          decryptedTest = privateDecrypt(
            { key: rsaPrivateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
            Buffer.from(encrypted.encryptedKeys, 'base64')
          ).toString('utf8')
          console.log("✅ DECRYPTION: Success with PEM export")
          decryptionSuccess = true
        } catch (keyError: any) {
          console.log("❌ DECRYPTION: PEM export failed:", keyError.message)
        }
      }
      
      // Approach 3: Try DER format directly as string (if keys are already DER)
      if (!decryptionSuccess) {
        try {
          console.log("🔓 DECRYPTION: Attempt 3 - Trying DER format directly...")
          const cleanPrivateKey = KEEPZ_PRIVATE_KEY.replace(/\s/g, '')
          const derKey = Buffer.from(cleanPrivateKey, 'base64')
          decryptedTest = privateDecrypt(
            { key: derKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
            Buffer.from(encrypted.encryptedKeys, 'base64')
          ).toString('utf8')
          console.log("✅ DECRYPTION: Success with DER format")
          decryptionSuccess = true
        } catch (keyError: any) {
          console.log("❌ DECRYPTION: DER format failed:", keyError.message)
        }
      }
      
      if (!decryptionSuccess) {
        throw new Error("All decryption attempts failed - keys may not be a matching pair")
      }
      
      console.log("Decrypted concat length:", decryptedTest.length)
      console.log("Decrypted concat first 100 chars:", decryptedTest.substring(0, 100))
      
      const [testKey, testIV] = decryptedTest.split('.')
      if (!testKey || !testIV) {
        throw new Error(`Failed to split decrypted data. Got: ${decryptedTest.substring(0, 200)}`)
      }
      console.log("✅ Split key and IV successfully")
      
      const testAesKey = Buffer.from(testKey, 'base64')
      const testIV_buf = Buffer.from(testIV, 'base64')
      console.log("AES key length:", testAesKey.length, "(should be 32)")
      console.log("IV length:", testIV_buf.length, "(should be 16)")
      
      const decipher = createDecipheriv('aes-256-cbc', testAesKey, testIV_buf)
      const decryptedData = Buffer.concat([
        decipher.update(Buffer.from(encrypted.encryptedData, 'base64')),
        decipher.final()
      ])
      console.log("✅ AES decryption successful")
      
      const decryptedPayload = JSON.parse(decryptedData.toString('utf8'))
      console.log("✅ JSON parsing successful")
      console.log("Decrypted payload:", JSON.stringify(decryptedPayload, null, 2))
      
      const matches = JSON.stringify(decryptedPayload) === JSON.stringify(orderPayload)
      console.log("✅ SELF-TEST PASSED: Can decrypt our own encryption")
      console.log("Decrypted payload matches:", matches)
      console.log("Used PEM for decryption:", usedPem)
    } catch (testError: any) {
      console.error("❌ SELF-TEST FAILED: Cannot decrypt our own encryption")
      console.error("Error message:", testError.message)
      console.error("Error stack:", testError.stack)
      console.error("This means our encryption is broken!")
    }

    const keepzRequestBody = {
      identifier: KEEPZ_INTEGRATOR_ID,
      encryptedData: encrypted.encryptedData,
      encryptedKeys: encrypted.encryptedKeys,
      aes: true
    }

    // Debug logging
    console.log("=== KEEPZ REQUEST PAYLOAD ===")
    console.log("Request URL:", `${KEEPZ_BASE_URL}/api/integrator/order`)
    console.log("Request Body (FULL):", JSON.stringify(keepzRequestBody, null, 2))
    console.log("---")
    console.log("FULL ENCRYPTED DATA (copy this):")
    console.log(encrypted.encryptedData)
    console.log("---")
    console.log("FULL ENCRYPTED KEYS (copy this):")
    console.log(encrypted.encryptedKeys)
    console.log("---")
    console.log("Original Payload (before encryption):", JSON.stringify(orderPayload, null, 2))
    console.log("Public Key Format:", KEEPZ_PUBLIC_KEY.includes('BEGIN') ? 'PEM' : 'DER')
    console.log("Public Key Length:", KEEPZ_PUBLIC_KEY.length)
    console.log("Public Key First 50 chars:", KEEPZ_PUBLIC_KEY.substring(0, 50))
    console.log("Encrypted Data Length:", encrypted.encryptedData.length)
    console.log("Encrypted Keys Length:", encrypted.encryptedKeys.length)
    console.log("=============================")

    // Log Keepz API request
    console.log("=".repeat(80))
    console.log(`📤 KEEPZ API REQUEST [${requestId}]`)
    console.log("=".repeat(80))
    console.log("Keepz API URL:", `${KEEPZ_BASE_URL}/api/integrator/order`)
    console.log("Keepz Request Method: POST")
    console.log("Keepz Request Headers:", JSON.stringify({ 'Content-Type': 'application/json' }, null, 2))
    console.log("Keepz Request Body:", JSON.stringify(keepzRequestBody, null, 2))
    console.log("-".repeat(80))

    const response = await fetch(`${KEEPZ_BASE_URL}/api/integrator/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keepzRequestBody)
    })

    const responseText = await response.text()
    
    // Log Keepz API response
    console.log("=".repeat(80))
    console.log(`📥 KEEPZ API RESPONSE [${requestId}]`)
    console.log("=".repeat(80))
    console.log("Keepz Response Status:", response.status, response.statusText)
    console.log("Keepz Response Headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2))
    console.log("Keepz Response Body:", responseText)
    console.log("=".repeat(80))

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
        console.log("KeyObject direct failed, trying PEM export:", keyError.message)
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
      console.log("Decrypted Keepz response:", decrypted)

      const successResponse = {
        success: true,
        payment_url: decrypted.urlForQR,
        order_id: integratorOrderId
      }

      // Log final response
      console.log("=".repeat(80))
      console.log(`📤 OUTGOING RESPONSE [${requestId}]`)
      console.log("=".repeat(80))
      console.log("Status: 200")
      console.log("Response Body:", JSON.stringify(successResponse, null, 2))
      console.log("=".repeat(80))

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    throw new Error("Failed to communicate with Keepz")

  } catch (error: any) {
    console.error("=".repeat(80))
    console.error(`❌ ERROR [${requestId}]`)
    console.error("=".repeat(80))
    console.error("Error Message:", error.message || "Unknown error")
    console.error("Error Stack:", error.stack || "No stack trace")
    console.error("Error Details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.error("=".repeat(80))

    const errorResponse = { 
      error: error.message || "Failed to save card" 
    }

    // Log error response
    console.log("=".repeat(80))
    console.log(`📤 OUTGOING RESPONSE [${requestId}]`)
    console.log("=".repeat(80))
    console.log("Status: 400")
    console.log("Response Body:", JSON.stringify(errorResponse, null, 2))
    console.log("=".repeat(80))

    return new Response(JSON.stringify(errorResponse), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})

