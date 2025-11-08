-- ============================================
-- ADD CAMPAIGN TRACKING TO SUBSCRIPTIONS
-- ============================================
-- Adds campaign/referral tracking columns to subscriptions table

-- Add campaign tracking columns
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS campaign_code TEXT,
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referral_source TEXT,  -- UTM source (e.g., "facebook", "google")
ADD COLUMN IF NOT EXISTS referral_medium TEXT,  -- UTM medium (e.g., "cpc", "social")
ADD COLUMN IF NOT EXISTS referral_campaign TEXT,  -- UTM campaign name
ADD COLUMN IF NOT EXISTS referral_content TEXT,  -- UTM content (for A/B testing)
ADD COLUMN IF NOT EXISTS referral_term TEXT,  -- UTM term (for keyword tracking)
ADD COLUMN IF NOT EXISTS landing_page TEXT,  -- First page user visited
ADD COLUMN IF NOT EXISTS conversion_page TEXT;  -- Page where they clicked subscribe

-- Create indexes for fast campaign queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_campaign_code ON public.subscriptions(campaign_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_campaign_id ON public.subscriptions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_referral_source ON public.subscriptions(referral_source);
CREATE INDEX IF NOT EXISTS idx_subscriptions_referral_medium ON public.subscriptions(referral_medium);

-- Create a composite index for campaign analytics
CREATE INDEX IF NOT EXISTS idx_subscriptions_campaign_analytics 
ON public.subscriptions(campaign_code, status, created_at) 
WHERE campaign_code IS NOT NULL;

-- Function to auto-populate campaign_id from campaign_code
CREATE OR REPLACE FUNCTION public.sync_campaign_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If campaign_code is provided but campaign_id is not, look it up
  IF NEW.campaign_code IS NOT NULL AND NEW.campaign_id IS NULL THEN
    SELECT id INTO NEW.campaign_id
    FROM public.marketing_campaigns
    WHERE campaign_code = NEW.campaign_code
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync campaign_id
DROP TRIGGER IF EXISTS sync_subscription_campaign_id ON public.subscriptions;
CREATE TRIGGER sync_subscription_campaign_id
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_campaign_id();

-- Success message
SELECT '✅ Campaign tracking columns added to subscriptions table!' as status;

