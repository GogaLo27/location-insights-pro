-- ============================================
-- UPDATE SIGNUP TRACKING FOR GOOGLE AUTH
-- ============================================
-- Since users sign in with Google (no separate signup form),
-- we need to capture campaign data when user profile is created

-- Update the handle_new_user function to check localStorage for campaign data
-- Note: This won't work because triggers run server-side, not client-side!
-- We need a different approach...

-- Instead, we'll track signups from the client side after auth

-- Create a function that can be called to update user campaign data
CREATE OR REPLACE FUNCTION public.update_user_signup_campaign(
  p_user_id UUID,
  p_campaign_code TEXT,
  p_utm_source TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_content TEXT DEFAULT NULL,
  p_utm_term TEXT DEFAULT NULL,
  p_landing_page TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Look up campaign_id from campaign_code
  IF p_campaign_code IS NOT NULL THEN
    SELECT id INTO v_campaign_id
    FROM public.marketing_campaigns
    WHERE campaign_code = p_campaign_code
    AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Update user profile with signup campaign info (only if not already set)
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
    updated_at = NOW()
  WHERE id = p_user_id
  AND signup_campaign_code IS NULL; -- Only update if not already set
  
  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'campaign_code', p_campaign_code,
    'campaign_id', v_campaign_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_user_signup_campaign TO authenticated;

-- Success message
SELECT '✅ Signup tracking function created!' as status;

