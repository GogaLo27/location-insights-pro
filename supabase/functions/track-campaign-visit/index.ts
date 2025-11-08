import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const {
      campaign_code,
      visitor_id,
      landing_page,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      user_agent,
      session_id
    } = await req.json()

    // Validate campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('id, is_active')
      .eq('campaign_code', campaign_code)
      .single()

    if (campaignError || !campaign) {
      console.log('Campaign not found:', campaign_code)
      // Still track it, but without campaign_id
    }

    if (campaign && !campaign.is_active) {
      console.log('Campaign is not active:', campaign_code)
    }

    // Get user if authenticated
    const auth = req.headers.get("Authorization")?.replace("Bearer ", "")
    let userId = null
    if (auth) {
      const { data: { user } } = await supabase.auth.getUser(auth)
      userId = user?.id || null
    }

    // Parse user agent for device type
    const deviceType = detectDeviceType(user_agent)
    const browser = detectBrowser(user_agent)

    // Get IP address
    const ip_address = req.headers.get('x-forwarded-for') || 
                       req.headers.get('x-real-ip') || 
                       'unknown'

    // Insert visit record
    const { error: insertError } = await supabase
      .from('campaign_visits')
      .insert({
        campaign_code,
        campaign_id: campaign?.id || null,
        visitor_id,
        user_id: userId,
        landing_page,
        referrer: referrer || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
        ip_address,
        user_agent: user_agent || null,
        device_type: deviceType,
        browser,
        session_id: session_id || null,
        visited_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error inserting visit:', insertError)
      throw insertError
    }

    console.log(`✅ Tracked visit for campaign: ${campaign_code}`)

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Visit tracked successfully'
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error tracking visit:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to track visit" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})

function detectDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'unknown'
  
  if (/mobile/i.test(userAgent)) return 'mobile'
  if (/tablet|ipad/i.test(userAgent)) return 'tablet'
  return 'desktop'
}

function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return 'unknown'
  
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) return 'chrome'
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'safari'
  if (/firefox/i.test(userAgent)) return 'firefox'
  if (/edge/i.test(userAgent)) return 'edge'
  return 'other'
}

