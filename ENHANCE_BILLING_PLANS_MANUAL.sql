-- ============================================
-- ENHANCE BILLING PLANS FOR ADMIN MANAGEMENT
-- Run this manually in Supabase SQL Editor
-- ============================================

-- First, delete old/duplicate plans
DELETE FROM public.billing_plans WHERE provider IS NULL OR provider = 'fake' OR price_cents IN (0, 1000, 10);

-- Drop constraint if it exists, then add unique constraint for plan_type + provider combination
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'billing_plans_plan_type_provider_unique'
  ) THEN
    ALTER TABLE public.billing_plans DROP CONSTRAINT billing_plans_plan_type_provider_unique;
  END IF;
END $$;

ALTER TABLE public.billing_plans 
ADD CONSTRAINT billing_plans_plan_type_provider_unique 
UNIQUE (plan_type, provider);

-- Add columns for better plan management
ALTER TABLE public.billing_plans 
ADD COLUMN IF NOT EXISTS plan_name TEXT,
ADD COLUMN IF NOT EXISTS plan_description TEXT,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_locations INTEGER,
ADD COLUMN IF NOT EXISTS max_reviews_per_month INTEGER,
ADD COLUMN IF NOT EXISTS support_level TEXT DEFAULT 'email' CHECK (support_level IN ('email', 'priority', 'dedicated')),
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billing_plans_plan_type ON public.billing_plans(plan_type);
CREATE INDEX IF NOT EXISTS idx_billing_plans_provider ON public.billing_plans(provider);
CREATE INDEX IF NOT EXISTS idx_billing_plans_is_active ON public.billing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_plans_sort_order ON public.billing_plans(sort_order);

-- Update existing plans with better names and descriptions
UPDATE public.billing_plans 
SET 
  plan_name = CASE 
    WHEN plan_type = 'starter' THEN 'Starter Plan'
    WHEN plan_type = 'professional' THEN 'Professional Plan'
    WHEN plan_type = 'enterprise' THEN 'Enterprise Plan'
  END,
  plan_description = CASE 
    WHEN plan_type = 'starter' THEN 'Perfect for small businesses getting started with review management'
    WHEN plan_type = 'professional' THEN 'Ideal for growing companies that need advanced analytics'
    WHEN plan_type = 'enterprise' THEN 'For large organizations requiring white-label solutions'
  END,
  features = CASE 
    WHEN plan_type = 'starter' THEN '["Up to 5 locations", "Basic review monitoring", "Email support", "Monthly reports"]'::jsonb
    WHEN plan_type = 'professional' THEN '["Up to 25 locations", "Advanced analytics", "Sentiment analysis", "Priority support", "Custom reports", "API access"]'::jsonb
    WHEN plan_type = 'enterprise' THEN '["Unlimited locations", "White-label solution", "Custom integrations", "Dedicated support", "Advanced security", "Custom branding"]'::jsonb
  END,
  max_locations = CASE 
    WHEN plan_type = 'starter' THEN 5
    WHEN plan_type = 'professional' THEN 25
    WHEN plan_type = 'enterprise' THEN NULL
  END,
  max_reviews_per_month = CASE 
    WHEN plan_type = 'starter' THEN 1000
    WHEN plan_type = 'professional' THEN 5000
    WHEN plan_type = 'enterprise' THEN NULL
  END,
  support_level = CASE 
    WHEN plan_type = 'starter' THEN 'email'
    WHEN plan_type = 'professional' THEN 'priority'
    WHEN plan_type = 'enterprise' THEN 'dedicated'
  END,
  sort_order = CASE 
    WHEN plan_type = 'starter' THEN 1
    WHEN plan_type = 'professional' THEN 2
    WHEN plan_type = 'enterprise' THEN 3
  END
WHERE plan_name IS NULL;

-- Create trigger for updated_at (drop first if exists)
DROP TRIGGER IF EXISTS update_billing_plans_updated_at ON public.billing_plans;
CREATE TRIGGER update_billing_plans_updated_at
BEFORE UPDATE ON public.billing_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create RLS policies for billing plans (drop first if exists)
DROP POLICY IF EXISTS "Anyone can view active billing plans" ON public.billing_plans;

-- Allow all users to view active plans (for plan selection)
CREATE POLICY "Anyone can view active billing plans" 
ON public.billing_plans 
FOR SELECT 
USING (is_active = true);

-- Note: Admin access will be handled through service role key in the admin panel
-- No additional RLS policies needed for admin operations

-- ============================================
-- INSERT/UPDATE PAYPAL PLANS WITH CORRECT DATA
-- ============================================

INSERT INTO public.billing_plans (
  plan_type, provider, provider_plan_id, price_cents, currency, interval, 
  paypal_product_id, paypal_plan_id, plan_name, plan_description, features,
  is_active, sort_order, max_locations, support_level
) VALUES
('starter', 'paypal', 'P-13539487MH2170147NCLHGVQ', 4900, 'USD', 'month', 
 'P-13539487MH2170147NCLHGVQ', 'P-13539487MH2170147NCLHGVQ',
 'Starter Plan', 'Perfect for small businesses getting started with review management',
 '["Up to 5 locations", "Basic review monitoring", "Email support", "Monthly reports"]'::jsonb,
 true, 1, 5, 'email'),
('professional', 'paypal', 'P-8U586980KM4532348NCLHGZA', 9900, 'USD', 'month',
 'P-8U586980KM4532348NCLHGZA', 'P-8U586980KM4532348NCLHGZA',
 'Professional Plan', 'Ideal for growing companies that need advanced analytics',
 '["Up to 25 locations", "Advanced analytics", "Sentiment analysis", "Priority support", "Custom reports", "API access"]'::jsonb,
 true, 2, 25, 'priority'),
('enterprise', 'paypal', 'P-30721362Y9010743BNCLHG4I', 19900, 'USD', 'month',
 'P-30721362Y9010743BNCLHG4I', 'P-30721362Y9010743BNCLHG4I',
 'Enterprise Plan', 'For large organizations requiring white-label solutions',
 '["Unlimited locations", "White-label solution", "Custom integrations", "Dedicated support", "Advanced security", "Custom branding"]'::jsonb,
 true, 3, NULL, 'dedicated')
ON CONFLICT (plan_type, provider) 
DO UPDATE SET
  price_cents = EXCLUDED.price_cents,
  plan_name = EXCLUDED.plan_name,
  plan_description = EXCLUDED.plan_description,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  max_locations = EXCLUDED.max_locations,
  support_level = EXCLUDED.support_level;
