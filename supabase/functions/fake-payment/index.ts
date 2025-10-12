import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the user from the JWT token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the request body
    const { plan_type } = await req.json()

    if (!plan_type) {
      return new Response(
        JSON.stringify({ error: 'Plan type is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate plan type
    const validPlanTypes = ['starter', 'professional', 'enterprise']
    if (!validPlanTypes.includes(plan_type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Create a fake subscription record with 30-day expiration
    const currentDate = new Date();
    const expirationDate = new Date(currentDate);
    expirationDate.setDate(currentDate.getDate() + 30); // 30 days from now
    
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_type: plan_type,
        status: 'active',
        provider: 'fake',
        provider_subscription_id: `fake-sub-${Date.now()}`,
        current_period_end: expirationDate, // PostgreSQL will handle the timestamp conversion
        cancel_at_period_end: false,
        created_at: currentDate,
        updated_at: currentDate
      })
      .select()
      .single()

    if (subError) {
      console.error('Error creating subscription:', subError)
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create or update user plan
    const { error: planError } = await supabaseClient
      .from('user_plans')
      .upsert({
        user_id: user.id,
        plan_type: plan_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })

    if (planError) {
      console.error('Error updating user plan:', planError)
      return new Response(
        JSON.stringify({ error: 'Failed to update user plan' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription_id: subscription.id,
        plan_type: plan_type,
        message: 'Payment successful! Your subscription has been activated.',
        redirect_url: `${req.headers.get('origin') || 'http://localhost:3000'}/location-selection`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
