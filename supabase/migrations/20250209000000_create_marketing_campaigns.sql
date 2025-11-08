-- ============================================
-- MARKETING CAMPAIGNS TABLE
-- ============================================
-- This table stores all marketing campaigns for tracking conversions

CREATE TABLE public.marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code TEXT NOT NULL UNIQUE,  -- e.g., "TEAM_A_FB_2024_Q1", "GOOGLE_SEARCH_JAN"
  campaign_name TEXT NOT NULL,
  campaign_source TEXT,  -- e.g., "facebook", "google", "email", "instagram"
  campaign_medium TEXT,  -- e.g., "cpc", "social", "newsletter", "banner"
  team_name TEXT,  -- e.g., "Team A", "Team B", "Marketing Team 1"
  team_lead TEXT,  -- Name of team lead
  start_date DATE,
  end_date DATE,
  budget_allocated NUMERIC(10,2),  -- Budget in dollars
  is_active BOOLEAN DEFAULT true,
  notes TEXT,  -- Additional notes about campaign
  metadata JSONB DEFAULT '{}'::jsonb,  -- For additional flexible campaign data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_campaigns_code ON public.marketing_campaigns(campaign_code);
CREATE INDEX idx_campaigns_source ON public.marketing_campaigns(campaign_source);
CREATE INDEX idx_campaigns_medium ON public.marketing_campaigns(campaign_medium);
CREATE INDEX idx_campaigns_team ON public.marketing_campaigns(team_name);
CREATE INDEX idx_campaigns_active ON public.marketing_campaigns(is_active);
CREATE INDEX idx_campaigns_dates ON public.marketing_campaigns(start_date, end_date);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view active campaigns
CREATE POLICY "Users can view active campaigns" 
ON public.marketing_campaigns 
FOR SELECT 
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_campaigns_updated_at
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.marketing_campaigns TO authenticated;

-- Insert some example campaigns for testing
INSERT INTO public.marketing_campaigns (
  campaign_code, 
  campaign_name, 
  campaign_source, 
  campaign_medium, 
  team_name, 
  is_active
) VALUES
  ('TEAM_A_FB_2024', 'Team A Facebook Campaign 2024', 'facebook', 'social', 'Team A', true),
  ('TEAM_B_GOOGLE', 'Team B Google Ads', 'google', 'cpc', 'Team B', true),
  ('TEAM_C_EMAIL', 'Team C Email Newsletter', 'email', 'newsletter', 'Team C', true),
  ('ORGANIC', 'Organic/Direct Traffic', 'organic', 'direct', 'Internal', true)
ON CONFLICT (campaign_code) DO NOTHING;

-- Success message
SELECT '✅ Marketing campaigns table created successfully!' as status;

