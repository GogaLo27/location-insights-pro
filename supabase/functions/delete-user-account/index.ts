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

    const userId = user.id

    // Delete user profile
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
    }

    // Delete user plan
    const { error: planError } = await supabaseClient
      .from('user_plans')
      .delete()
      .eq('user_id', userId)

    if (planError) {
      console.error('Error deleting user plan:', planError)
    }

    // Delete any other user-related data (add more tables as needed)
    // For example, if you have user_locations table:
    // const { error: locationsError } = await supabaseClient
    //   .from('user_locations')
    //   .delete()
    //   .eq('user_id', userId)

    // Delete the user from Supabase Auth
    // Note: This requires admin privileges, so we'll handle it differently
    // The user will need to be deleted manually from the Supabase dashboard
    // or through a separate admin function

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Account data deleted successfully. Please contact support to complete account deletion.',
        note: 'User authentication data will be deleted by an administrator.'
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
