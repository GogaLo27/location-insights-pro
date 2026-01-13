-- ============================================
-- ADD TEST PLAN FOR KEEPZ TESTING
-- ============================================
-- This is a test plan that charges 1 GEL weekly
-- Keepz only supports MONTHLY and WEEKLY intervals (not daily)
-- Easy to remove later

-- Insert test Keepz plan with all Professional features
INSERT INTO public.billing_plans (
  plan_type, 
  provider, 
  provider_plan_id, 
  price_cents, 
  currency, 
  interval,
  plan_name,
  plan_description,
  features,
  is_active,
  sort_order,
  max_locations,
  max_reviews_per_month,
  support_level
) VALUES (
  'test_weekly',
  'keepz',
  'TEST_WEEKLY_PLAN',
  100,  -- 1 GEL (100 cents)
  'GEL',
  'week',
  'Test Plan (Weekly)',
  'TEST ONLY - 1 GEL/week - Has all Professional features for testing',
  '["Up to 25 locations", "Advanced analytics", "Sentiment analysis", "Priority support", "Custom reports", "API access", "TEST PLAN - DELETE LATER"]'::jsonb,
  true,
  0,  -- Show first in list
  25,
  5000,
  'priority'
)
ON CONFLICT DO NOTHING;

-- Also need to update the plan_type check constraint to allow 'test_weekly'
-- First drop the old constraint if it exists
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

-- Add new constraint that includes test_weekly
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_type_check 
  CHECK (plan_type IN ('starter', 'professional', 'enterprise', 'test_weekly'));

-- Same for invoices table
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_plan_type_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_plan_type_check 
  CHECK (plan_type IN ('starter', 'professional', 'enterprise', 'test_weekly'));

