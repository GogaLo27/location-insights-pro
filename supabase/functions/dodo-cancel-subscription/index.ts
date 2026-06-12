import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = [
  "https://dibiex.com",
  "https://www.dibiex.com",
  "https://admin.dibiex.com",
  "http://localhost:8080",
  "http://localhost:5173",
]

const DODO_API_KEY = Deno.env.get('DODO_API_KEY') ?? ''
const DODO_MODE = Deno.env.get('DODO_MODE') ?? 'test_mode'
const DODO_BASE_URL = DODO_MODE === 'live_mode'
  ? 'https://api.dodopayments.com'
  : 'https://test.dodopayments.com'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })

  try {
    const auth = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(auth || '')
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    const { subscription_id } = await req.json()
    if (!subscription_id) throw new Error('subscription_id is required')

    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .single()

    if (subErr || !subscription) throw new Error('Subscription not found')
    if (subscription.provider !== 'dodo') throw new Error('Not a Dodo subscription')

    // If subscription never fully activated (no dodo_subscription_id), cancel locally
    if (!subscription.dodo_subscription_id) {
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', subscription_id)

      return new Response(JSON.stringify({ success: true, message: 'Subscription cancelled' }), {
        status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Cancel via Dodo API
    // NOTE: Verify exact endpoint and payload from Dodo's API reference:
    // https://docs.dodopayments.com/api-reference/subscriptions/patch-subscriptions
    const cancelRes = await fetch(`${DODO_BASE_URL}/subscriptions/${subscription.dodo_subscription_id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DODO_API_KEY}`,
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })

    if (!cancelRes.ok) {
      const errText = await cancelRes.text()
      throw new Error(`Dodo API error: ${errText}`)
    }

    const now = new Date().toISOString()
    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
      .eq('id', subscription_id)

    await supabase.from('subscription_events').insert({
      subscription_id: subscription.id,
      event_type: 'subscription_cancelled',
      dodo_event_id: subscription.dodo_subscription_id,
      event_data: {
        cancelled_at: now,
        cancelled_by: user.id,
        provider: 'dodo',
      },
    })

    return new Response(JSON.stringify({ success: true, message: 'Subscription cancelled successfully' }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('dodo-cancel-subscription error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to cancel subscription' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
