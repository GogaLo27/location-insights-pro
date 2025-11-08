-- ============================================
-- CAMPAIGN VISITS & FUNNEL TRACKING
-- ============================================
-- Track every visit to campaign URLs and full conversion funnel

-- Create campaign_visits table to track clicks
CREATE TABLE IF NOT EXISTS public.campaign_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code TEXT NOT NULL,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
  
  -- Visitor information
  visitor_id TEXT,  -- Anonymous ID from browser fingerprint
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- If logged in
  
  -- Visit details
  landing_page TEXT,
  referrer TEXT,  -- Where they came from
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Technical details
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,  -- mobile, desktop, tablet
  browser TEXT,
  country TEXT,
  
  -- Session tracking
  session_id TEXT,  -- Track user session
  
  -- Timestamps
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX idx_campaign_visits_campaign_code ON public.campaign_visits(campaign_code);
CREATE INDEX idx_campaign_visits_campaign_id ON public.campaign_visits(campaign_id);
CREATE INDEX idx_campaign_visits_visitor_id ON public.campaign_visits(visitor_id);
CREATE INDEX idx_campaign_visits_user_id ON public.campaign_visits(user_id);
CREATE INDEX idx_campaign_visits_visited_at ON public.campaign_visits(visited_at);
CREATE INDEX idx_campaign_visits_session_id ON public.campaign_visits(session_id);

-- Enable RLS
ALTER TABLE public.campaign_visits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert visits (for tracking)
CREATE POLICY "Anyone can insert campaign visits" 
ON public.campaign_visits 
FOR INSERT 
WITH CHECK (true);

-- Only admins can view via service role
-- No SELECT policy for regular users

-- Grant permissions
GRANT INSERT ON public.campaign_visits TO anon, authenticated;

-- ============================================
-- UPDATE user_profiles to track signup campaigns better
-- ============================================

-- Add session tracking
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS signup_session_id TEXT,
ADD COLUMN IF NOT EXISTS signup_ip_address TEXT,
ADD COLUMN IF NOT EXISTS signup_device_type TEXT;

-- ============================================
-- CREATE CAMPAIGN FUNNEL ANALYTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW public.campaign_funnel_analytics AS
SELECT 
  mc.id as campaign_id,
  mc.campaign_code,
  mc.campaign_name,
  mc.campaign_source,
  mc.campaign_medium,
  mc.team_name,
  mc.is_active,
  
  -- STEP 1: Visits/Clicks
  COUNT(DISTINCT cv.id) as total_visits,
  COUNT(DISTINCT cv.visitor_id) as unique_visitors,
  
  -- STEP 2: Signups
  COUNT(DISTINCT up.id) as total_signups,
  
  -- STEP 3: Subscriptions
  COUNT(DISTINCT s.id) as total_subscriptions,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) as active_subscriptions,
  
  -- STEP 4: Revenue
  ROUND(SUM(CASE WHEN s.status IN ('active', 'cancelled') 
      THEN COALESCE(bp.price_cents, 0) ELSE 0 END) / 100.0, 2) as total_revenue,
  
  -- Conversion Rates
  CASE 
    WHEN COUNT(DISTINCT cv.visitor_id) > 0 
    THEN ROUND(COUNT(DISTINCT up.id)::NUMERIC / COUNT(DISTINCT cv.visitor_id) * 100, 2)
    ELSE 0 
  END as visit_to_signup_rate,
  
  CASE 
    WHEN COUNT(DISTINCT up.id) > 0 
    THEN ROUND(COUNT(DISTINCT s.id)::NUMERIC / COUNT(DISTINCT up.id) * 100, 2)
    ELSE 0 
  END as signup_to_subscription_rate,
  
  CASE 
    WHEN COUNT(DISTINCT cv.visitor_id) > 0 
    THEN ROUND(COUNT(DISTINCT s.id)::NUMERIC / COUNT(DISTINCT cv.visitor_id) * 100, 2)
    ELSE 0 
  END as overall_conversion_rate,
  
  -- Time metrics
  MIN(cv.visited_at) as first_visit,
  MAX(cv.visited_at) as last_visit,
  COUNT(DISTINCT DATE(cv.visited_at)) as active_days

FROM public.marketing_campaigns mc
LEFT JOIN public.campaign_visits cv ON mc.campaign_code = cv.campaign_code
LEFT JOIN public.user_profiles up ON mc.campaign_code = up.signup_campaign_code
LEFT JOIN public.subscriptions s ON mc.campaign_code = s.campaign_code
LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
  AND bp.provider = s.payment_method
  AND bp.is_active = true
GROUP BY 
  mc.id, mc.campaign_code, mc.campaign_name, mc.campaign_source, 
  mc.campaign_medium, mc.team_name, mc.is_active
ORDER BY total_visits DESC NULLS LAST;

GRANT SELECT ON public.campaign_funnel_analytics TO authenticated;

-- ============================================
-- CREATE RECENT VISITS VIEW
-- ============================================

CREATE OR REPLACE VIEW public.recent_campaign_visits AS
SELECT 
  cv.id,
  cv.campaign_code,
  mc.campaign_name,
  mc.team_name,
  cv.visitor_id,
  cv.user_id,
  up.email,
  up.full_name,
  cv.landing_page,
  cv.referrer,
  cv.utm_source,
  cv.utm_medium,
  cv.device_type,
  cv.country,
  cv.visited_at,
  -- Did they sign up?
  CASE WHEN cv.user_id IS NOT NULL THEN true ELSE false END as converted_to_signup,
  -- Did they subscribe?
  CASE WHEN EXISTS (
    SELECT 1 FROM public.subscriptions s 
    WHERE s.user_id = cv.user_id 
    AND s.campaign_code = cv.campaign_code
  ) THEN true ELSE false END as converted_to_subscription
FROM public.campaign_visits cv
LEFT JOIN public.marketing_campaigns mc ON cv.campaign_code = mc.campaign_code
LEFT JOIN public.user_profiles up ON cv.user_id = up.id
ORDER BY cv.visited_at DESC
LIMIT 1000;

GRANT SELECT ON public.recent_campaign_visits TO authenticated;

-- ============================================
-- CREATE DAILY FUNNEL STATS VIEW
-- ============================================

CREATE OR REPLACE VIEW public.daily_campaign_funnel AS
SELECT 
  DATE(cv.visited_at) as date,
  cv.campaign_code,
  mc.campaign_name,
  mc.team_name,
  COUNT(DISTINCT cv.id) as daily_visits,
  COUNT(DISTINCT cv.visitor_id) as daily_unique_visitors,
  COUNT(DISTINCT CASE 
    WHEN up.created_at::DATE = DATE(cv.visited_at) 
    THEN up.id 
  END) as daily_signups,
  COUNT(DISTINCT CASE 
    WHEN s.created_at::DATE = DATE(cv.visited_at) 
    THEN s.id 
  END) as daily_subscriptions,
  ROUND(SUM(CASE 
    WHEN s.created_at::DATE = DATE(cv.visited_at) 
    AND s.status IN ('active', 'cancelled')
    THEN COALESCE(bp.price_cents, 0) 
    ELSE 0 
  END) / 100.0, 2) as daily_revenue
FROM public.campaign_visits cv
LEFT JOIN public.marketing_campaigns mc ON cv.campaign_code = mc.campaign_code
LEFT JOIN public.user_profiles up ON cv.campaign_code = up.signup_campaign_code 
  AND DATE(up.created_at) = DATE(cv.visited_at)
LEFT JOIN public.subscriptions s ON cv.campaign_code = s.campaign_code 
  AND DATE(s.created_at) = DATE(cv.visited_at)
LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
  AND bp.provider = s.payment_method
GROUP BY DATE(cv.visited_at), cv.campaign_code, mc.campaign_name, mc.team_name
ORDER BY date DESC, daily_visits DESC;

GRANT SELECT ON public.daily_campaign_funnel TO authenticated;

-- Success message
SELECT '✅ Campaign visit tracking and funnel analytics created!' as status;

