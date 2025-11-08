# Campaign Tracking System - Database Setup

## Overview
This migration set adds a complete campaign/referral tracking system to track which marketing campaigns drive user subscriptions.

## Migration Files (Run in Order)

1. **20250209000000_create_marketing_campaigns.sql**
   - Creates the `marketing_campaigns` table
   - Stores campaign details (code, name, source, medium, team, budget)
   - Adds example campaigns for testing

2. **20250209000001_add_campaign_tracking_to_subscriptions.sql**
   - Adds campaign tracking columns to `subscriptions` table
   - Tracks campaign_code, UTM parameters, landing page, conversion page
   - Auto-syncs campaign_id from campaign_code

3. **20250209000002_add_campaign_tracking_to_user_profiles.sql**
   - Adds signup campaign tracking to `user_profiles` table
   - Tracks initial campaign when user signs up
   - Records UTM parameters, IP address, user agent

4. **20250209000003_create_campaign_analytics_views.sql**
   - Creates 5 analytics views for reporting:
     - `campaign_conversion_analytics` - Overall campaign performance
     - `daily_campaign_conversions` - Daily conversion trends
     - `team_performance` - Performance by marketing team
     - `source_performance` - Performance by traffic source
     - `recent_campaign_conversions` - Latest conversions

5. **20250209000004_create_campaign_helper_functions.sql**
   - Creates helper functions:
     - `track_campaign_visit()` - Track campaign when user visits
     - `get_campaign_performance()` - Get campaign metrics
     - `get_team_performance()` - Get team metrics
     - `get_user_campaign_attribution()` - Get user's campaign history
     - `validate_campaign_code()` - Check if campaign code is valid

6. **20250209000005_seed_example_campaigns.sql**
   - Seeds example campaigns for each team
   - Includes campaigns for Team A, Team B, Team C
   - Add your own campaigns here or via admin panel

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file content in order
4. Click "Run" for each file
5. Verify success messages appear

### Option 2: Supabase CLI
```bash
cd client
supabase db push
```

## Testing the Setup

After running migrations, test with these queries:

```sql
-- Check if campaigns table exists and has data
SELECT * FROM public.marketing_campaigns LIMIT 10;

-- Check if subscriptions table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name LIKE '%campaign%' OR column_name LIKE '%referral%';

-- Check analytics views
SELECT * FROM public.campaign_conversion_analytics;

-- Test a helper function
SELECT public.validate_campaign_code('TEAM_A_FB_WINTER_2024');
```

## Campaign URL Format

Marketing teams should use URLs in this format:

```
Basic Campaign:
https://yoursite.com/?ref=TEAM_A_FB_WINTER_2024

With UTM Parameters:
https://yoursite.com/?ref=TEAM_B_GOOGLE_SEARCH&utm_source=google&utm_medium=cpc&utm_campaign=winter_promo

Plan Selection Page:
https://yoursite.com/plan-selection?ref=TEAM_C_EMAIL_WEEKLY&utm_source=email&utm_medium=newsletter
```

## Database Schema

### marketing_campaigns
- `id` - UUID primary key
- `campaign_code` - Unique campaign identifier (e.g., "TEAM_A_FB_2024")
- `campaign_name` - Human-readable name
- `campaign_source` - Traffic source (facebook, google, email)
- `campaign_medium` - Medium type (cpc, social, newsletter)
- `team_name` - Marketing team name
- `team_lead` - Team leader name
- `budget_allocated` - Campaign budget
- `is_active` - Whether campaign is active
- Timestamps and metadata

### subscriptions (new columns)
- `campaign_code` - Campaign that drove the subscription
- `campaign_id` - Foreign key to marketing_campaigns
- `referral_source` - UTM source
- `referral_medium` - UTM medium
- `referral_campaign` - UTM campaign
- `referral_content` - UTM content
- `referral_term` - UTM term
- `landing_page` - First page visited
- `conversion_page` - Page where they subscribed

### user_profiles (new columns)
- `signup_campaign_code` - Campaign at signup
- `signup_campaign_id` - Foreign key to marketing_campaigns
- `signup_referral_source` - UTM source at signup
- `signup_referral_medium` - UTM medium at signup
- `signup_referral_campaign` - UTM campaign at signup
- `signup_landing_page` - First page visited
- `signup_ip_address` - IP at signup
- `signup_user_agent` - Browser at signup

## Next Steps

1. ✅ Run all migration files
2. ⏭️ Update Edge Functions (paypal-create-subscription)
3. ⏭️ Update Frontend (PlanSelection.tsx, Campaign Context)
4. ⏭️ Build Admin Panel pages (Campaign Management, Analytics)
5. ⏭️ Test end-to-end flow
6. ⏭️ Train marketing teams on using campaign URLs

## Support

If you encounter any errors:
1. Check migration order (must run in sequence)
2. Verify table names match your schema
3. Check for conflicts with existing columns
4. Review Supabase logs for detailed errors

## Customization

To add your own campaigns, either:
- Edit `20250209000005_seed_example_campaigns.sql`
- Or add them later via SQL Editor or Admin Panel

