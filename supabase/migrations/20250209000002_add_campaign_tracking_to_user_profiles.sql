-- ============================================
-- ADD CAMPAIGN TRACKING TO USER PROFILES
-- ============================================
-- Tracks the campaign/referral source when user first signed up

-- Add campaign tracking columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS signup_campaign_code TEXT,
ADD COLUMN IF NOT EXISTS signup_campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS signup_referral_source TEXT,  -- UTM source at signup
ADD COLUMN IF NOT EXISTS signup_referral_medium TEXT,  -- UTM medium at signup
ADD COLUMN IF NOT EXISTS signup_referral_campaign TEXT,  -- UTM campaign at signup
ADD COLUMN IF NOT EXISTS signup_referral_content TEXT,  -- UTM content
ADD COLUMN IF NOT EXISTS signup_referral_term TEXT,  -- UTM term
ADD COLUMN IF NOT EXISTS signup_landing_page TEXT,  -- First page visited
ADD COLUMN IF NOT EXISTS signup_ip_address TEXT,  -- IP address at signup (optional)
ADD COLUMN IF NOT EXISTS signup_user_agent TEXT;  -- Browser user agent (optional)

-- Create indexes for reporting
CREATE INDEX IF NOT EXISTS idx_user_profiles_signup_campaign ON public.user_profiles(signup_campaign_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_signup_campaign_id ON public.user_profiles(signup_campaign_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_signup_source ON public.user_profiles(signup_referral_source);

-- Function to sync signup campaign_id
CREATE OR REPLACE FUNCTION public.sync_user_signup_campaign_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If signup_campaign_code is provided but signup_campaign_id is not, look it up
  IF NEW.signup_campaign_code IS NOT NULL AND NEW.signup_campaign_id IS NULL THEN
    SELECT id INTO NEW.signup_campaign_id
    FROM public.marketing_campaigns
    WHERE campaign_code = NEW.signup_campaign_code
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS sync_user_profile_campaign_id ON public.user_profiles;
CREATE TRIGGER sync_user_profile_campaign_id
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_signup_campaign_id();

-- Success message
SELECT '✅ Campaign tracking columns added to user_profiles table!' as status;

