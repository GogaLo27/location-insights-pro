import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { publicEncrypt, createCipheriv, randomBytes, constants } from "node:crypto"
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

const KEEPZ_INTEGRATOR_ID = Deno.env.get('KEEPZ_INTEGRATOR_ID') ?? ''
const KEEPZ_PUBLIC_KEY = Deno.env.get('KEEPZ_PUBLIC_KEY') ?? ''

// Encrypt function for Keepz API
function encryptKeepzPayload(data: object, paddingMode: 'PKCS1' | 'OAEP' = 'PKCS1'): { encryptedData: string; encryptedKeys: string } {
  // 1. Generate AES-256 key and IV
  const aesKey = randomBytes(32)
  const iv = randomBytes(16)

  // 2. Encrypt data with AES-256-CBC
  const cipher = createCipheriv('aes-256-cbc', aesKey, iv)
  const encryptedData = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(data), 'utf8')),
    cipher.final()
  ])

  // 3. Prepare the key concatenation
  const encodedKey = aesKey.toString('base64')
  const encodedIV = iv.toString('base64')
  const concat = `${encodedKey}.${encodedIV}`

  // 4. Create RSA public key PEM
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${KEEPZ_PUBLIC_KEY.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`

  // 5. Encrypt the concat with RSA
  let encryptedKeys: Buffer
  if (paddingMode === 'PKCS1') {
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

    const { subscription_id } = await req.json()

    if (!subscription_id) {
      throw new Error("subscription_id is required")
    }

    // Get the subscription
    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .eq("user_id", user.id)
      .single()

    if (subErr || !subscription) {
      throw new Error("Subscription not found")
    }

    if (subscription.provider !== "keepz") {
      throw new Error("This subscription is not a Keepz subscription")
    }

    if (!subscription.keepz_subscription_id) {
      // No Keepz subscription ID yet, just cancel locally
      const { error: updateErr } = await supabase
        .from("subscriptions")
        .update({ 
          status: "cancelled",
          cancelled_at: new Date().toISOString()
        })
        .eq("id", subscription_id)

      if (updateErr) throw updateErr

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Subscription cancelled" 
      }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    // Build revoke payload
    const revokePayload = {
      subscriptionId: subscription.keepz_subscription_id,
      integratorId: KEEPZ_INTEGRATOR_ID,
    }

    console.log("Revoking Keepz subscription:", revokePayload)

    // Try PKCS1 first
    const paddingModes: Array<'PKCS1' | 'OAEP'> = ['PKCS1', 'OAEP']
    let lastError: Error | null = null

    for (const paddingMode of paddingModes) {
      try {
        const encrypted = encryptKeepzPayload(revokePayload, paddingMode)

        const keepzResponse = await fetch(`${KEEPZ_BASE_URL}/api/integrator/subscription/revoke`, {
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
        console.log(`Keepz revoke response (${paddingMode}):`, responseText)

        if (responseText.includes('Failed to decrypt') || responseText.includes('6010')) {
          lastError = new Error(`Decryption failed with ${paddingMode}`)
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

        // Success - update local subscription
        const { error: updateErr } = await supabase
          .from("subscriptions")
          .update({ 
            status: "cancelled",
            cancelled_at: new Date().toISOString()
          })
          .eq("id", subscription_id)

        if (updateErr) throw updateErr

        // Log the event
        await supabase
          .from("subscription_events")
          .insert({
            subscription_id: subscription.id,
            event_type: "subscription_cancelled",
            keepz_event_id: subscription.keepz_subscription_id,
            event_data: {
              cancelled_at: new Date().toISOString(),
              cancelled_by: user.id,
              provider: "keepz"
            }
          })

        return new Response(JSON.stringify({ 
          success: true, 
          message: "Subscription cancelled successfully" 
        }), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" }
        })
      } catch (err) {
        lastError = err as Error
        continue
      }
    }

    throw lastError || new Error("Failed to cancel subscription")

  } catch (error) {
    console.error("Error cancelling Keepz subscription:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to cancel subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})

