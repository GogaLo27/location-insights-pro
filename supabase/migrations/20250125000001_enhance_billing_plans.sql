-- ============================================
-- ENHANCE BILLING PLANS FOR ADMIN MANAGEMENT
-- ============================================

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
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

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

-- Create trigger for updated_at
CREATE TRIGGER update_billing_plans_updated_at
BEFORE UPDATE ON public.billing_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create RLS policies for billing plans
-- Allow all users to view active plans (for plan selection)
CREATE POLICY "Anyone can view active billing plans" 
ON public.billing_plans 
FOR SELECT 
USING (is_active = true);

-- Note: Admin access will be handled through service role key in the admin panel
-- No additional RLS policies needed for admin operations
