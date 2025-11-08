-- ============================================
-- CAMPAIGN TRACKING HELPER FUNCTIONS
-- ============================================
-- Functions to help with campaign tracking and data retrieval

-- ============================================
-- FUNCTION 1: Track Campaign Visit
-- ============================================
-- Records campaign information when a user visits (before subscription)
CREATE OR REPLACE FUNCTION public.track_campaign_visit(
  p_user_id UUID,
  p_campaign_code TEXT DEFAULT NULL,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_landing_page TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_campaign_id UUID;
  v_result JSON;
BEGIN
  -- Look up campaign_id from campaign_code
  IF p_campaign_code IS NOT NULL THEN
    SELECT id INTO v_campaign_id
    FROM public.marketing_campaigns
    WHERE campaign_code = p_campaign_code
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Update user profile with campaign info (only if not already set)
  UPDATE public.user_profiles
  SET 
    signup_campaign_code = COALESCE(signup_campaign_code, p_campaign_code),
    signup_campaign_id = COALESCE(signup_campaign_id, v_campaign_id),
    signup_referral_source = COALESCE(signup_referral_source, p_utm_source),
    signup_referral_medium = COALESCE(signup_referral_medium, p_utm_medium),
    signup_referral_campaign = COALESCE(signup_referral_campaign, p_utm_campaign),
    signup_referral_content = COALESCE(signup_referral_content, p_utm_content),
    signup_referral_term = COALESCE(signup_referral_term, p_utm_term),
    signup_landing_page = COALESCE(signup_landing_page, p_landing_page),
    signup_ip_address = COALESCE(signup_ip_address, p_ip_address),
    signup_user_agent = COALESCE(signup_user_agent, p_user_agent),
    updated_at = NOW()
  WHERE id = p_user_id;
  
  v_result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'campaign_code', p_campaign_code,
    'campaign_id', v_campaign_id,
    'tracked_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.track_campaign_visit TO authenticated;

-- ============================================
-- FUNCTION 2: Get Campaign Performance
-- ============================================
-- Returns detailed performance metrics for a specific campaign
CREATE OR REPLACE FUNCTION public.get_campaign_performance(
  p_campaign_code TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'campaign_code', p_campaign_code,
    'campaign_name', mc.campaign_name,
    'team_name', mc.team_name,
    'total_conversions', COUNT(DISTINCT s.user_id),
    'active_subscriptions', COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END),
    'total_revenue', ROUND(SUM(CASE WHEN s.status IN ('active', 'cancelled') 
        THEN COALESCE(bp.price_cents, 0) ELSE 0 END) / 100.0, 2),
    'avg_order_value', ROUND(AVG(bp.price_cents) / 100.0, 2),
    'plan_breakdown', json_build_object(
      'starter', COUNT(CASE WHEN s.plan_type = 'starter' THEN 1 END),
      'professional', COUNT(CASE WHEN s.plan_type = 'professional' THEN 1 END),
      'enterprise', COUNT(CASE WHEN s.plan_type = 'enterprise' THEN 1 END)
    ),
    'first_conversion', MIN(s.created_at),
    'last_conversion', MAX(s.created_at)
  ) INTO v_result
  FROM public.marketing_campaigns mc
  LEFT JOIN public.subscriptions s ON mc.campaign_code = s.campaign_code
    AND (p_start_date IS NULL OR DATE(s.created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(s.created_at) <= p_end_date)
  LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
    AND bp.provider = s.payment_method
  WHERE mc.campaign_code = p_campaign_code
  GROUP BY mc.campaign_code, mc.campaign_name, mc.team_name;
  
  RETURN COALESCE(v_result, json_build_object('error', 'Campaign not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_campaign_performance TO authenticated;

-- ============================================
-- FUNCTION 3: Get Team Performance Summary
-- ============================================
-- Returns performance summary for a specific team
CREATE OR REPLACE FUNCTION public.get_team_performance(
  p_team_name TEXT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'team_name', p_team_name,
    'total_campaigns', COUNT(DISTINCT mc.id),
    'active_campaigns', COUNT(DISTINCT CASE WHEN mc.is_active THEN mc.id END),
    'total_conversions', COUNT(DISTINCT s.user_id),
    'active_subscriptions', COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.user_id END),
    'total_revenue', ROUND(SUM(CASE WHEN s.status IN ('active', 'cancelled') 
        THEN COALESCE(bp.price_cents, 0) ELSE 0 END) / 100.0, 2),
    'avg_order_value', ROUND(AVG(bp.price_cents) / 100.0, 2),
    'total_budget', SUM(mc.budget_allocated)
  ) INTO v_result
  FROM public.marketing_campaigns mc
  LEFT JOIN public.subscriptions s ON mc.campaign_code = s.campaign_code
    AND (p_start_date IS NULL OR DATE(s.created_at) >= p_start_date)
    AND (p_end_date IS NULL OR DATE(s.created_at) <= p_end_date)
  LEFT JOIN public.billing_plans bp ON s.plan_type = bp.plan_type 
    AND bp.provider = s.payment_method
  WHERE mc.team_name = p_team_name
  GROUP BY p_team_name;
  
  RETURN COALESCE(v_result, json_build_object('error', 'Team not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_team_performance TO authenticated;

-- ============================================
-- FUNCTION 4: Get User Campaign Attribution
-- ============================================
-- Returns campaign attribution for a specific user
CREATE OR REPLACE FUNCTION public.get_user_campaign_attribution(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', p_user_id,
    'signup_attribution', json_build_object(
      'campaign_code', up.signup_campaign_code,
      'source', up.signup_referral_source,
      'medium', up.signup_referral_medium,
      'campaign', up.signup_referral_campaign,
      'landing_page', up.signup_landing_page,
      'signup_date', up.created_at
    ),
    'subscription_attribution', (
      SELECT json_agg(
        json_build_object(
          'subscription_id', s.id,
          'campaign_code', s.campaign_code,
          'campaign_name', mc.campaign_name,
          'team_name', mc.team_name,
          'source', s.referral_source,
          'medium', s.referral_medium,
          'plan_type', s.plan_type,
          'status', s.status,
          'conversion_date', s.created_at
        ) ORDER BY s.created_at DESC
      )
      FROM public.subscriptions s
      LEFT JOIN public.marketing_campaigns mc ON s.campaign_code = mc.campaign_code
      WHERE s.user_id = p_user_id
    )
  ) INTO v_result
  FROM public.user_profiles up
  WHERE up.id = p_user_id;
  
  RETURN COALESCE(v_result, json_build_object('error', 'User not found'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_user_campaign_attribution TO authenticated;

-- ============================================
-- FUNCTION 5: Validate Campaign Code
-- ============================================
-- Checks if a campaign code is valid and active
CREATE OR REPLACE FUNCTION public.validate_campaign_code(p_campaign_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_campaign RECORD;
BEGIN
  SELECT 
    id,
    campaign_code,
    campaign_name,
    team_name,
    is_active,
    start_date,
    end_date
  INTO v_campaign
  FROM public.marketing_campaigns
  WHERE campaign_code = p_campaign_code;
  
  IF v_campaign IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Campaign code not found'
    );
  END IF;
  
  IF NOT v_campaign.is_active THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Campaign is not active'
    );
  END IF;
  
  IF v_campaign.end_date IS NOT NULL AND v_campaign.end_date < CURRENT_DATE THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Campaign has ended'
    );
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'campaign_id', v_campaign.id,
    'campaign_name', v_campaign.campaign_name,
    'team_name', v_campaign.team_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.validate_campaign_code TO authenticated;

-- Success message
SELECT '✅ Campaign helper functions created successfully!' as status;
SELECT '🔧 Available functions:' as info;
SELECT '   - track_campaign_visit()' as function_name;
SELECT '   - get_campaign_performance()' as function_name;
SELECT '   - get_team_performance()' as function_name;
SELECT '   - get_user_campaign_attribution()' as function_name;
SELECT '   - validate_campaign_code()' as function_name;

