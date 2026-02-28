import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCipheriv, randomBytes } from "node:crypto"
import { Buffer } from "node:buffer"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KEEPZ_MODE = Deno.env.get('KEEPZ_MODE') || 'dev'
const KEEPZ_BASE_URL = KEEPZ_MODE === 'live' 
  ? 'https://gateway.keepz.me/ecommerce-service'
  : 'https://gateway.dev.keepz.me/ecommerce-service'

const KEEPZ_INTEGRATOR_ID = Deno.env.get('KEEPZ_INTEGRATOR_ID') ?? ''
const KEEPZ_PUBLIC_KEY = Deno.env.get('KEEPZ_PUBLIC_KEY') ?? ''

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function arrayBufferToB64(ab: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(ab)))
}

async function encryptForKeepz(data: object, publicKeyB64: string): Promise<{ encryptedData: string; encryptedKeys: string }> {
  const aesKey = randomBytes(32)
  const iv = randomBytes(16)

  const cipher = createCipheriv('aes-256-cbc', aesKey, iv)
  const encryptedData = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(data), 'utf8')),
    cipher.final()
  ])

  const concat = `${aesKey.toString('base64')}.${iv.toString('base64')}`

  const rsaPublicKey = await crypto.subtle.importKey(
    'spki',
    b64ToArrayBuffer(publicKeyB64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  )

  const encryptedKeysBuffer = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    new TextEncoder().encode(concat)
  )

  return {
    encryptedData: encryptedData.toString('base64'),
    encryptedKeys: arrayBufferToB64(encryptedKeysBuffer),
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(auth || "")
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: cors 
      })
    }

    const { subscription_id } = await req.json()
    if (!subscription_id) throw new Error("subscription_id is required")

    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscription_id)
      .eq("user_id", user.id)
      .single()

    if (subErr || !subscription) throw new Error("Subscription not found")
    if (subscription.provider !== "keepz") throw new Error("This subscription is not a Keepz subscription")

    if (!subscription.keepz_subscription_id) {
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", subscription_id)

      return new Response(JSON.stringify({ success: true, message: "Subscription cancelled" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    const revokePayload = {
      subscriptionId: subscription.keepz_subscription_id,
      integratorId: KEEPZ_INTEGRATOR_ID,
    }

    const encrypted = await encryptForKeepz(revokePayload, KEEPZ_PUBLIC_KEY)

    const keepzResponse = await fetch(`${KEEPZ_BASE_URL}/api/v1/integrator/subscription/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: KEEPZ_INTEGRATOR_ID,
        encryptedData: encrypted.encryptedData,
        encryptedKeys: encrypted.encryptedKeys,
        aes: true,
      }),
    })

    const responseText = await keepzResponse.text()
    if (!keepzResponse.ok) {
      let errorData
      try { errorData = JSON.parse(responseText) } catch { errorData = { message: responseText } }
      throw new Error(`Keepz API error: ${errorData.message || responseText}`)
    }

    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", subscription_id)

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

    return new Response(JSON.stringify({ success: true, message: "Subscription cancelled successfully" }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to cancel subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})
