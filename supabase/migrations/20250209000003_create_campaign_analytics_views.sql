-- ============================================
-- CAMPAIGN ANALYTICS VIEWS
-- ============================================
-- Pre-built views for easy campaign performance reporting

-- ============================================
-- VIEW 1: Campaign Conversion Analytics
-- ============================================
-- Shows conversion metrics for each campaign
CREATE OR REPLACE VIEW public.campaign_conversion_analytics AS
SELECT 
  mc.id as campaign_id,
  mc.campaign_code,
  mc.campaign_name,
  mc.campaign_source,
  mc.campaign_medium,
  mc.team_name,
  mc.team_lead,
  mc.is_active,
  mc.budget_allocated,
  
  -- Conversion metrics
  COUNT(DISTINCT s.user_id) as total_conversions,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscriptions,
  COUNT(DISTINCT CASE WHEN s.status = 'cancelled' THEN s.user_id END) as cancelled_subscriptions,
  COUNT(DISTINCT CASE WHEN s.status = 'pending' THEN s.user_id END) as pending_subscriptions,
  
  -- Revenue metrics (in dollars)
  ROUND(SUM(CASE WHEN s.status IN ('active', 'cancelled') 
      THEN COALESCE(bp.price_cents, 0) ELSE 0 END) / 100.0, 2) as total_revenue,
  ROUND(AVG(CASE WHEN s.status IN ('active', 'cancelled')
      THEN bp.price_cents END) / 100.0, 2) as avg_plan_value,
  
  -- Plan breakdown
  COUNT(CASE WHEN s.plan_type = 'starter' THEN 1 END) as starter_plan_count,
  COUNT(CASE WHEN s.plan_type = 'professional' THEN 1 END) as professional_plan_count,
  COUNT(CASE WHEN s.plan_type = 'enterprise' THEN 1 END) as enterprise_plan_count,
  
  -- Time metrics
  MIN(s.created_at) as first_conversion_date,
  MAX(s.created_at) as last_conversion_date,
  
  -- Campaign dates
  mc.start_date,
  mc.end_date,
  mc.created_at as campaign_created_at
  
FROM public.marketing_campaigns mc
LEFT JOIN public.subscriptions s ON mc.campaign_code = s.campaign_code
LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
  AND bp.provider = s.payment_method
  AND bp.is_active = true
GROUP BY 
  mc.id, mc.campaign_code, mc.campaign_name, mc.campaign_source, 
  mc.campaign_medium, mc.team_name, mc.team_lead, mc.is_active,
  mc.budget_allocated, mc.start_date, mc.end_date, mc.created_at
ORDER BY total_conversions DESC NULLS LAST;

GRANT SELECT ON public.campaign_conversion_analytics TO authenticated;

-- ============================================
-- VIEW 2: Daily Campaign Conversions
-- ============================================
-- Shows daily conversion trends by campaign
CREATE OR REPLACE VIEW public.daily_campaign_conversions AS
SELECT 
  DATE(s.created_at) as conversion_date,
  s.campaign_code,
  mc.campaign_name,
  mc.campaign_source,
  mc.campaign_medium,
  mc.team_name,
  
  -- Daily metrics
  COUNT(*) as daily_conversions,
  COUNT(CASE WHEN s.status = 'active' THEN 1 END) as daily_active,
  ROUND(SUM(bp.price_cents) / 100.0, 2) as daily_revenue,
  
  -- Plan breakdown
  COUNT(CASE WHEN s.plan_type = 'starter' THEN 1 END) as starter_count,
  COUNT(CASE WHEN s.plan_type = 'professional' THEN 1 END) as professional_count,
  COUNT(CASE WHEN s.plan_type = 'enterprise' THEN 1 END) as enterprise_count

FROM public.subscriptions s
LEFT JOIN public.marketing_campaigns mc ON s.campaign_code = mc.campaign_code
LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
  AND bp.provider = s.payment_method
WHERE s.campaign_code IS NOT NULL
GROUP BY 
  DATE(s.created_at), s.campaign_code, mc.campaign_name, 
  mc.campaign_source, mc.campaign_medium, mc.team_name
ORDER BY conversion_date DESC, daily_conversions DESC;

GRANT SELECT ON public.daily_campaign_conversions TO authenticated;

-- ============================================
-- VIEW 3: Team Performance
-- ============================================
-- Shows performance metrics by marketing team
CREATE OR REPLACE VIEW public.team_performance AS
SELECT 
  mc.team_name,
  mc.team_lead,
  
  -- Campaign metrics
  COUNT(DISTINCT mc.id) as total_campaigns,
  COUNT(DISTINCT CASE WHEN mc.is_active THEN mc.id END) as active_campaigns,
  
  -- Conversion metrics
  COUNT(DISTINCT s.user_id) as total_conversions,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_subscriptions,
  
  -- Revenue metrics
  ROUND(SUM(CASE WHEN s.status IN ('active', 'cancelled')
      THEN COALESCE(bp.price_cents, 0) ELSE 0 END) / 100.0, 2) as total_revenue,
  ROUND(AVG(bp.price_cents) / 100.0, 2) as avg_order_value,
  
  -- Budget metrics
  SUM(mc.budget_allocated) as total_budget_allocated,
  
  -- Best performing campaign
  (
    SELECT campaign_name 
    FROM public.marketing_campaigns mc2 
    LEFT JOIN public.subscriptions s2 ON mc2.campaign_code = s2.campaign_code
    WHERE mc2.team_name = mc.team_name
    GROUP BY mc2.campaign_name
    ORDER BY COUNT(s2.id) DESC
    LIMIT 1
  ) as best_campaign

FROM public.marketing_campaigns mc
LEFT JOIN public.subscriptions s ON mc.campaign_code = s.campaign_code
LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
  AND bp.provider = s.payment_method
WHERE mc.team_name IS NOT NULL
GROUP BY mc.team_name, mc.team_lead
ORDER BY total_revenue DESC NULLS LAST;

GRANT SELECT ON public.team_performance TO authenticated;

-- ============================================
-- VIEW 4: Campaign Source Performance
-- ============================================
-- Shows performance by traffic source (Facebook, Google, etc.)
CREATE OR REPLACE VIEW public.source_performance AS
SELECT 
  COALESCE(s.referral_source, mc.campaign_source, 'unknown') as traffic_source,
  COALESCE(s.referral_medium, mc.campaign_medium, 'unknown') as traffic_medium,
  
  COUNT(DISTINCT s.user_id) as total_conversions,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END) as active_conversions,
  ROUND(SUM(CASE WHEN s.status IN ('active', 'cancelled')
      THEN COALESCE(bp.price_cents, 0) ELSE 0 END) / 100.0, 2) as total_revenue,
  ROUND(AVG(bp.price_cents) / 100.0, 2) as avg_order_value,
  
  COUNT(DISTINCT s.campaign_code) as campaigns_used,
  
  MIN(s.created_at) as first_conversion,
  MAX(s.created_at) as last_conversion

FROM public.subscriptions s
LEFT JOIN public.marketing_campaigns mc ON s.campaign_code = mc.campaign_code
LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
  AND bp.provider = s.payment_method
WHERE s.campaign_code IS NOT NULL OR s.referral_source IS NOT NULL
GROUP BY 
  COALESCE(s.referral_source, mc.campaign_source, 'unknown'),
  COALESCE(s.referral_medium, mc.campaign_medium, 'unknown')
ORDER BY total_revenue DESC NULLS LAST;

GRANT SELECT ON public.source_performance TO authenticated;

-- ============================================
-- VIEW 5: Recent Campaign Conversions
-- ============================================
-- Shows the most recent conversions with full details
CREATE OR REPLACE VIEW public.recent_campaign_conversions AS
SELECT 
  s.id as subscription_id,
  s.user_id,
  up.email,
  up.full_name,
  up.company_name,
  s.campaign_code,
  mc.campaign_name,
  mc.team_name,
  s.plan_type,
  s.status,
  ROUND(bp.price_cents / 100.0, 2) as plan_price,
  s.referral_source,
  s.referral_medium,
  s.referral_campaign,
  s.landing_page,
  s.conversion_page,
  s.created_at as conversion_time,
  s.payment_method
FROM public.subscriptions s
LEFT JOIN public.user_profiles up ON s.user_id = up.id
LEFT JOIN public.marketing_campaigns mc ON s.campaign_code = mc.campaign_code
LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
  AND bp.provider = s.payment_method
WHERE s.campaign_code IS NOT NULL
ORDER BY s.created_at DESC
LIMIT 1000;

GRANT SELECT ON public.recent_campaign_conversions TO authenticated;

-- Success message
SELECT '✅ Campaign analytics views created successfully!' as status;
SELECT '📊 Available views:' as info;
SELECT '   - campaign_conversion_analytics' as view_name;
SELECT '   - daily_campaign_conversions' as view_name;
SELECT '   - team_performance' as view_name;
SELECT '   - source_performance' as view_name;
SELECT '   - recent_campaign_conversions' as view_name;

