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

    const {
      plan_type,
      campaign_code,
      referral_source,
      referral_medium,
      referral_campaign,
      referral_content,
      referral_term,
      landing_page,
      conversion_page,
    } = await req.json()

    if (!plan_type) {
      return new Response(JSON.stringify({ error: 'plan_type is required' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Fetch Dodo billing plan
    const { data: billingPlan, error: planErr } = await supabase
      .from('billing_plans')
      .select('dodo_product_id, price_cents, plan_name')
      .eq('provider', 'dodo')
      .eq('plan_type', plan_type)
      .eq('is_active', true)
      .single()

    if (planErr || !billingPlan?.dodo_product_id) {
      return new Response(JSON.stringify({ error: 'Plan not available' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // Fetch user profile for display name
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // Clean up orphaned pending Dodo subscriptions older than 2 hours
    await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'dodo')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())

    // Create pending subscription row
    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type,
        status: 'pending',
        provider: 'dodo',
        payment_method: 'dodo',
        can_refund: true,
        refund_eligible_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        campaign_code: campaign_code ?? null,
        referral_source: referral_source ?? null,
        referral_medium: referral_medium ?? null,
        referral_campaign: referral_campaign ?? null,
        referral_content: referral_content ?? null,
        referral_term: referral_term ?? null,
        landing_page: landing_page ?? null,
        conversion_page: conversion_page ?? null,
      })
      .select()
      .single()

    if (subErr || !subscription) {
      throw new Error('Failed to create subscription record')
    }

    // Create Dodo hosted checkout session
    const checkoutRes = await fetch(`${DODO_BASE_URL}/checkouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DODO_API_KEY}`,
      },
      body: JSON.stringify({
        product_cart: [{ product_id: billingPlan.dodo_product_id, quantity: 1 }],
        customer: {
          email: user.email ?? userProfile?.email,
          name: userProfile?.full_name ?? user.email ?? 'Customer',
        },
        return_url: 'https://dibiex.com/billing-success',
      }),
    })

    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text()
      await supabase.from('subscriptions').delete().eq('id', subscription.id)
      throw new Error(`Dodo checkout creation failed: ${errText}`)
    }

    const checkoutData = await checkoutRes.json()

    // Store Dodo session_id for webhook correlation
    await supabase
      .from('subscriptions')
      .update({ provider_subscription_id: checkoutData.session_id })
      .eq('id', subscription.id)

    return new Response(JSON.stringify({ checkout_url: checkoutData.checkout_url }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('dodo-create-checkout error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to create checkout' }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
    })
  }
})
