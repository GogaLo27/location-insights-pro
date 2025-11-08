import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
)

interface PayPalSubscriptionData {
  id: string
  status: string
  plan_id: string
  subscriber: {
    payer_id: string
    email_address: string
  }
  create_time: string
  update_time: string
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

interface PayPalPlanData {
  id: string
  product_id: string
  name: string
  status: string
  billing_cycles: Array<{
    frequency: {
      interval_unit: string
      interval_count: number
    }
    tenure_type: string
    sequence: number
    total_cycles: number
    pricing_scheme: {
      fixed_price: {
        value: string
        currency_code: string
      }
    }
  }>
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "")
    const { data: { user } } = await supabase.auth.getUser(auth || "")
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors })

    const { 
      plan_type, 
      return_url, 
      cancel_url,
      // Campaign tracking parameters
      campaign_code,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      landing_page,
      conversion_page
    } = await req.json()

    // Get PayPal credentials
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
    const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox'
    const baseUrl = mode === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com'

    console.log(baseUrl)

    if (!clientId || !clientSecret) {
      throw new Error("PayPal configuration missing")
    }

    // Get PayPal product and plan IDs
    const productIds = {
      starter: Deno.env.get('PAYPAL_STARTER_PRODUCT_ID'),
      professional: Deno.env.get('PAYPAL_PROFESSIONAL_PRODUCT_ID'),
      enterprise: Deno.env.get('PAYPAL_ENTERPRISE_PRODUCT_ID')
    }

    const planIds = {
      starter: Deno.env.get('PAYPAL_STARTER_PLAN_ID'),
      professional: Deno.env.get('PAYPAL_PROFESSIONAL_PLAN_ID'),
      enterprise: Deno.env.get('PAYPAL_ENTERPRISE_PLAN_ID')
    }

    if (!productIds[plan_type] || !planIds[plan_type]) {
      throw new Error(`PayPal configuration missing for plan: ${plan_type}`)
    }

    // Get access token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      throw new Error(`Failed to get PayPal access token: ${errorText}`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Create local subscription (pending) with campaign tracking
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .insert({ 
        user_id: user.id, 
        plan_type, 
        status: "pending",
        provider: "paypal",
        payment_method: "paypal",
        paypal_plan_id: planIds[plan_type],
        refund_eligible_until: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
        // Campaign tracking data
        campaign_code: campaign_code || null,
        referral_source: utm_source || null,
        referral_medium: utm_medium || null,
        referral_campaign: utm_campaign || null,
        referral_content: utm_content || null,
        referral_term: utm_term || null,
        landing_page: landing_page || null,
        conversion_page: conversion_page || null
      })
      .select("*")
      .single()

    if (subErr) throw subErr

    // Create PayPal subscription
    const subscriptionPayload = {
      plan_id: planIds[plan_type],
      subscriber: {
        name: {
          given_name: user.user_metadata?.full_name?.split(' ')[0] || 'User',
          surname: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
        },
        email_address: user.email
      },
      application_context: {
        brand_name: "DibiEx",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
        },
        return_url: return_url || `${req.headers.get('origin')}/billing-success`,
        cancel_url: cancel_url || `${req.headers.get('origin')}/plan-selection`
      },
      custom_id: sub.id
    }

    const subscriptionResponse = await fetch(`${baseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': crypto.randomUUID()
      },
      body: JSON.stringify(subscriptionPayload)
    })

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text()
      console.error("PayPal subscription creation failed:", errorText)
      throw new Error(`Failed to create PayPal subscription: ${errorText}`)
    }

    const subscriptionData: PayPalSubscriptionData = await subscriptionResponse.json()

    // Update local subscription with PayPal subscription ID
    const { error: updateErr } = await supabase
      .from("subscriptions")
      .update({
        paypal_subscription_id: subscriptionData.id,
        provider_subscription_id: subscriptionData.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", sub.id)

    if (updateErr) throw updateErr

    // Log subscription creation event
    await supabase
      .from("subscription_events")
      .insert({
        subscription_id: sub.id,
        event_type: "subscription_created",
        paypal_event_id: subscriptionData.id,
        event_data: {
          plan_type: plan_type,
          paypal_subscription_id: subscriptionData.id,
          created_at: new Date().toISOString()
        }
      })

    // Get approval URL from links
    const approvalLink = subscriptionData.links.find(link => link.rel === 'approve')
    if (!approvalLink) {
      throw new Error("No approval URL found in PayPal response")
    }

    return new Response(JSON.stringify({
      success: true,
      checkout_url: approvalLink.href,
      subscription_id: sub.id,
      paypal_subscription_id: subscriptionData.id
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error creating PayPal subscription:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to create subscription" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})
