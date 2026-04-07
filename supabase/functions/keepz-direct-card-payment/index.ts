import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCipheriv, randomBytes, createDecipheriv } from "node:crypto"
import { Buffer } from "node:buffer"

const allowedOrigins = ["https://dibiex.com", "https://www.dibiex.com", "https://admin.dibiex.com", "http://localhost:8080", "http://localhost:5173"];

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

async function decryptFromKeepz(encryptedDataB64: string, encryptedKeysB64: string, privateKeyB64: string): Promise<any> {
  const rsaPrivateKey = await crypto.subtle.importKey(
    'pkcs8',
    b64ToArrayBuffer(privateKeyB64),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt']
  )

  const decryptedKeysBuffer = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    b64ToArrayBuffer(encryptedKeysB64)
  )

  const decryptedConcat = new TextDecoder().decode(decryptedKeysBuffer)
  const [encodedKey, encodedIV] = decryptedConcat.split('.')
  const aesKey = Buffer.from(encodedKey, 'base64')
  const iv = Buffer.from(encodedIV, 'base64')

  const decipher = createDecipheriv('aes-256-cbc', aesKey, iv)
  const decryptedData = Buffer.concat([
    decipher.update(Buffer.from(encryptedDataB64, 'base64')),
    decipher.final()
  ])

  return JSON.parse(decryptedData.toString('utf8'))
}

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
    }
    const { data: { user } } = await supabase.auth.getUser(auth)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
    }

    const body = await req.json().catch(() => null)
    const { plan_type, billing_plan_id, return_url, cancel_url } = body || {}

    if (!plan_type) throw new Error('plan_type is required')
    const validPlanTypes = ['starter', 'professional', 'enterprise']
    if (!validPlanTypes.includes(plan_type)) {
      return new Response(JSON.stringify({ error: `Invalid plan_type. Must be one of: ${validPlanTypes.join(', ')}` }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }
    if (!billing_plan_id) throw new Error('billing_plan_id is required')

    if (!KEEPZ_PUBLIC_KEY || !KEEPZ_PRIVATE_KEY) {
      throw new Error('Keepz configuration missing')
    }

    // Fetch billing plan
    const { data: billingPlan, error: planErr } = await supabase
      .from('billing_plans')
      .select('*')
      .eq('id', billing_plan_id)
      .eq('provider', 'keepz')
      .eq('is_active', true)
      .single()

    if (planErr || !billingPlan) throw new Error('Billing plan not found or not available')

    const price = billingPlan.price_cents / 100
    const keepzOrderId = crypto.randomUUID()

    // Create pending subscription record
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type,
        status: 'pending',
        provider: 'keepz',
        payment_method: 'keepz_card',
        keepz_order_id: keepzOrderId,
        refund_eligible_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single()

    if (subErr) throw subErr

    const successUrl = return_url || `${origin}/billing-success`
    const failUrl = cancel_url || `${origin}/checkout?plan=${plan_type}`

    // Build order payload — direct card entry via Credo bank page, no card save, EUR
    const orderPayload = {
      amount: price,
      receiverId: KEEPZ_RECEIVER_ID,
      receiverType: 'BRANCH',
      integratorId: KEEPZ_INTEGRATOR_ID,
      integratorOrderId: keepzOrderId,
      currency: 'EUR',
      saveCard: false,
      directLinkProvider: 'CREDO',
      successRedirectUri: successUrl,
      failRedirectUri: failUrl,
      callbackUri: `${Deno.env.get('SUPABASE_URL')}/functions/v1/keepz-webhook`,
      language: 'EN',
    }

    console.log('keepz-direct-card-payment ORDER PAYLOAD:', JSON.stringify(orderPayload))

    const encrypted = await encryptForKeepz(orderPayload, KEEPZ_PUBLIC_KEY)

    const response = await fetch(`${KEEPZ_BASE_URL}/api/integrator/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: KEEPZ_INTEGRATOR_ID,
        encryptedData: encrypted.encryptedData,
        encryptedKeys: encrypted.encryptedKeys,
        aes: true
      })
    })

    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      throw new Error(`Invalid response from Keepz: ${responseText}`)
    }

    console.log('keepz-direct-card-payment KEEPZ RESPONSE:', JSON.stringify(responseData))

    if (responseData.message && responseData.statusCode) {
      throw new Error(`Keepz API error: ${responseData.message}`)
    }

    let paymentUrl: string | undefined

    if (responseData.encryptedData && responseData.encryptedKeys) {
      const decrypted = await decryptFromKeepz(responseData.encryptedData, responseData.encryptedKeys, KEEPZ_PRIVATE_KEY)
      paymentUrl = decrypted.urlForQR || decrypted.paymentUrl || decrypted.url
    } else if (responseData.urlForQR) {
      paymentUrl = responseData.urlForQR
    } else if (responseData.paymentUrl) {
      paymentUrl = responseData.paymentUrl
    }

    if (!paymentUrl) {
      throw new Error('Keepz did not return a payment URL')
    }

    return new Response(JSON.stringify({
      success: true,
      payment_url: paymentUrl,
      subscription_id: sub.id,
      order_id: keepzOrderId,
    }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('keepz-direct-card-payment error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'Failed to initiate payment'
    }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
