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
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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

    const { subscription_id, refund_reason } = await req.json()
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: 'subscription_id is required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Fetch subscription and verify ownership
    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .eq('user_id', user.id)
      .single()

    if (subErr || !subscription) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Check 48-hour refund eligibility
    if (!subscription.can_refund) {
      return new Response(JSON.stringify({ error: 'This subscription is not eligible for a refund' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    if (subscription.refund_eligible_until && new Date() > new Date(subscription.refund_eligible_until)) {
      return new Response(JSON.stringify({ error: 'The 48-hour refund window has expired' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Payment ID is set after payment.succeeded webhook fires (2–10 min after subscription.active)
    if (!subscription.dodo_payment_id) {
      return new Response(JSON.stringify({
        error: 'Payment confirmation is still processing. Please try again in a few minutes.'
      }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Call Dodo refund API
    // NOTE: Verify the exact endpoint from Dodo's API reference (likely under /payments or /refunds)
    const refundRes = await fetch(`${DODO_BASE_URL}/payments/${subscription.dodo_payment_id}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DODO_API_KEY}`,
      },
      body: JSON.stringify({
        reason: refund_reason || 'customer_request',
      }),
    })

    if (!refundRes.ok) {
      const errText = await refundRes.text()
      console.error('Dodo refund failed:', errText)
      throw new Error(`Dodo refund API error: ${errText}`)
    }

    const refundData = await refundRes.json()
    const now = new Date().toISOString()

    // Cancel subscription and mark as non-refundable
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        can_refund: false,
        updated_at: now,
      })
      .eq('id', subscription_id)

    // Mark the relevant invoice as refunded
    await supabase
      .from('invoices')
      .update({ status: 'refunded', updated_at: now })
      .eq('subscription_id', subscription_id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(1)

    // Log refund event
    await supabase.from('subscription_events').insert({
      subscription_id: subscription_id,
      event_type: 'refund_processed',
      dodo_event_id: refundData.refund_id ?? refundData.id ?? subscription.dodo_payment_id,
      event_data: {
        refund_id: refundData.refund_id ?? refundData.id,
        payment_id: subscription.dodo_payment_id,
        refund_reason: refund_reason || 'User requested refund',
        refunded_at: now,
      },
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Refund processed successfully',
      refund_id: refundData.refund_id ?? refundData.id,
    }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('dodo-refund error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to process refund' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
