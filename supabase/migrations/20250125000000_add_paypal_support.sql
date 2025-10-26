-- ============================================
-- PAYPAL SUBSCRIPTION INTEGRATION - DATABASE UPDATE
-- ============================================

-- Add PayPal-specific columns to existing tables
-- These columns will be NULL for existing LemonSqueezy data

-- Update billing_plans table to support PayPal
ALTER TABLE public.billing_plans 
ADD COLUMN IF NOT EXISTS paypal_product_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT;

-- Update subscriptions table to support PayPal
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_agreement_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_plan_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'paypal';

-- Update subscription_events table to support PayPal events
ALTER TABLE public.subscription_events 
ADD COLUMN IF NOT EXISTS paypal_event_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_webhook_id TEXT;

-- Update payment_transactions table to support PayPal (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions' AND table_schema = 'public') THEN
    ALTER TABLE public.payment_transactions 
    ADD COLUMN IF NOT EXISTS paypal_transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS paypal_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'paypal';
  END IF;
END $$;



-- ============================================
-- CREATE PAYPAL BILLING PLANS
-- ============================================

-- Insert PayPal plans alongside existing LemonSqueezy plans
INSERT INTO public.billing_plans (plan_type, provider, provider_plan_id, price_cents, currency, interval, paypal_product_id, paypal_plan_id) VALUES
('starter', 'paypal', 'PAYPAL_STARTER_PLAN_ID', 4900, 'USD', 'month', 'PAYPAL_STARTER_PRODUCT_ID', 'PAYPAL_STARTER_PLAN_ID'),
('professional', 'paypal', 'PAYPAL_PROFESSIONAL_PLAN_ID', 9900, 'USD', 'month', 'PAYPAL_PROFESSIONAL_PRODUCT_ID', 'PAYPAL_PROFESSIONAL_PLAN_ID'),
('enterprise', 'paypal', 'PAYPAL_ENTERPRISE_PLAN_ID', 19900, 'USD', 'month', 'PAYPAL_ENTERPRISE_PRODUCT_ID', 'PAYPAL_ENTERPRISE_PLAN_ID')
ON CONFLICT DO NOTHING;

-- ============================================
-- ADD INDEXES FOR PAYPAL FIELDS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_billing_plans_paypal_product_id ON public.billing_plans(paypal_product_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_paypal_plan_id ON public.billing_plans(paypal_plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_subscription_id ON public.subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_agreement_id ON public.subscriptions(paypal_agreement_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_method ON public.subscriptions(payment_method);

-- Add indexes for payment_transactions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_paypal_transaction_id ON public.payment_transactions(paypal_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_paypal_payment_id ON public.payment_transactions(paypal_payment_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_method ON public.payment_transactions(payment_method);
  END IF;
END $$;

-- ============================================
-- UPDATE HELPER FUNCTIONS FOR PAYPAL
-- ============================================

-- Function to get PayPal product ID by plan type
CREATE OR REPLACE FUNCTION public.get_paypal_product_id(plan_type_param TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT paypal_product_id 
    FROM public.billing_plans 
    WHERE plan_type = plan_type_param 
    AND provider = 'paypal'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get PayPal plan ID by plan type
CREATE OR REPLACE FUNCTION public.get_paypal_plan_id(plan_type_param TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT paypal_plan_id 
    FROM public.billing_plans 
    WHERE plan_type = plan_type_param 
    AND provider = 'paypal'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription by PayPal subscription ID
CREATE OR REPLACE FUNCTION public.get_subscription_by_paypal_id(paypal_subscription_id_param TEXT)
RETURNS TABLE(id UUID, user_id UUID, plan_type TEXT, status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.user_id, s.plan_type, s.status
  FROM public.subscriptions s
  WHERE s.paypal_subscription_id = paypal_subscription_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_paypal_product_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_paypal_plan_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_by_paypal_id TO authenticated;

-- ============================================
-- UPDATE EXISTING SUBSCRIPTIONS
-- ============================================

-- Set default payment method for existing subscriptions
UPDATE public.subscriptions 
SET payment_method = 'lemonsqueezy' 
WHERE payment_method IS NULL AND provider = 'lemonsqueezy';

-- ============================================
-- CREATE PAYPAL SUBSCRIPTION STATUS VIEW
-- ============================================

CREATE OR REPLACE VIEW public.paypal_subscription_status AS
SELECT 
  s.id,
  s.user_id,
  s.plan_type,
  s.status,
  s.payment_method,
  s.paypal_subscription_id,
  s.paypal_agreement_id,
  s.current_period_end,
  s.created_at,
  s.updated_at,
  up.email,
  up.full_name,
  up.company_name
FROM public.subscriptions s
LEFT JOIN public.user_profiles up ON s.user_id = up.id
WHERE s.payment_method = 'paypal' OR s.paypal_subscription_id IS NOT NULL;

-- Grant permissions for the view
GRANT SELECT ON public.paypal_subscription_status TO authenticated;
