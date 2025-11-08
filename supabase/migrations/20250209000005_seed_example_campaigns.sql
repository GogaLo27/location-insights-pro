-- ============================================
-- SEED EXAMPLE CAMPAIGNS
-- ============================================
-- Inserts example campaigns for each marketing team
-- You can modify these or add your own campaigns

-- Clear any existing example campaigns (optional - remove if you want to keep them)
-- DELETE FROM public.marketing_campaigns WHERE campaign_code LIKE 'EXAMPLE_%';

-- Team A Campaigns
INSERT INTO public.marketing_campaigns (
  campaign_code, 
  campaign_name, 
  campaign_source, 
  campaign_medium, 
  team_name,
  team_lead,
  start_date,
  end_date,
  budget_allocated,
  is_active,
  notes
) VALUES
  (
    'TEAM_A_FB_WINTER_2024', 
    'Team A Facebook Winter Promotion 2024', 
    'facebook', 
    'social', 
    'Team A',
    'John Smith',
    '2024-11-01',
    '2024-12-31',
    5000.00,
    true,
    'Facebook ads targeting small business owners'
  ),
  (
    'TEAM_A_INSTA_Q1', 
    'Team A Instagram Q1 Campaign', 
    'instagram', 
    'social', 
    'Team A',
    'John Smith',
    '2025-01-01',
    '2025-03-31',
    3000.00,
    true,
    'Instagram stories and posts'
  ),
  (
    'TEAM_A_LINKEDIN', 
    'Team A LinkedIn Professional', 
    'linkedin', 
    'social', 
    'Team A',
    'John Smith',
    '2024-11-01',
    NULL,
    2000.00,
    true,
    'LinkedIn B2B targeting'
  )
ON CONFLICT (campaign_code) DO NOTHING;

-- Team B Campaigns
INSERT INTO public.marketing_campaigns (
  campaign_code, 
  campaign_name, 
  campaign_source, 
  campaign_medium, 
  team_name,
  team_lead,
  start_date,
  budget_allocated,
  is_active,
  notes
) VALUES
  (
    'TEAM_B_GOOGLE_SEARCH', 
    'Team B Google Search Ads', 
    'google', 
    'cpc', 
    'Team B',
    'Sarah Johnson',
    '2024-11-01',
    10000.00,
    true,
    'Google Search ads for review management keywords'
  ),
  (
    'TEAM_B_GOOGLE_DISPLAY', 
    'Team B Google Display Network', 
    'google', 
    'display', 
    'Team B',
    'Sarah Johnson',
    '2024-12-01',
    5000.00,
    true,
    'Google Display Network banner ads'
  ),
  (
    'TEAM_B_YOUTUBE', 
    'Team B YouTube Video Ads', 
    'youtube', 
    'video', 
    'Team B',
    'Sarah Johnson',
    '2025-01-01',
    7500.00,
    true,
    'YouTube pre-roll and mid-roll ads'
  )
ON CONFLICT (campaign_code) DO NOTHING;

-- Team C Campaigns
INSERT INTO public.marketing_campaigns (
  campaign_code, 
  campaign_name, 
  campaign_source, 
  campaign_medium, 
  team_name,
  team_lead,
  start_date,
  budget_allocated,
  is_active,
  notes
) VALUES
  (
    'TEAM_C_EMAIL_WEEKLY', 
    'Team C Weekly Newsletter', 
    'email', 
    'newsletter', 
    'Team C',
    'Mike Davis',
    '2024-11-01',
    1000.00,
    true,
    'Weekly email newsletter to subscribers'
  ),
  (
    'TEAM_C_EMAIL_PROMO', 
    'Team C Promotional Email Campaign', 
    'email', 
    'promotion', 
    'Team C',
    'Mike Davis',
    '2024-12-15',
    1500.00,
    true,
    'Holiday promotional email blast'
  ),
  (
    'TEAM_C_BLOG', 
    'Team C Blog Content Marketing', 
    'blog', 
    'content', 
    'Team C',
    'Mike Davis',
    '2024-11-01',
    500.00,
    true,
    'Blog content and SEO efforts'
  )
ON CONFLICT (campaign_code) DO NOTHING;

-- Additional Tracking Codes
INSERT INTO public.marketing_campaigns (
  campaign_code, 
  campaign_name, 
  campaign_source, 
  campaign_medium, 
  team_name,
  is_active,
  notes
) VALUES
  (
    'ORGANIC', 
    'Organic/Direct Traffic', 
    'organic', 
    'direct', 
    'Internal',
    true,
    'Users who came directly or through organic search'
  ),
  (
    'REFERRAL', 
    'Partner Referrals', 
    'referral', 
    'partner', 
    'Partnerships',
    true,
    'Users referred by partners or affiliates'
  ),
  (
    'RETARGETING', 
    'Retargeting Campaign', 
    'retargeting', 
    'display', 
    'Internal',
    true,
    'Retargeting previous website visitors'
  )
ON CONFLICT (campaign_code) DO NOTHING;

-- Success message with summary
SELECT '✅ Example campaigns seeded successfully!' as status;

SELECT 
  '📊 Campaign Summary:' as info,
  COUNT(*) as total_campaigns,
  COUNT(DISTINCT team_name) as total_teams,
  SUM(budget_allocated) as total_budget
FROM public.marketing_campaigns;

SELECT 
  '👥 Campaigns by Team:' as info,
  team_name,
  COUNT(*) as campaign_count,
  SUM(budget_allocated) as team_budget
FROM public.marketing_campaigns
WHERE team_name IS NOT NULL
GROUP BY team_name
ORDER BY team_name;

