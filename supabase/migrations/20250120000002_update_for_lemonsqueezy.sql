-- ============================================
-- LEMONSQUEEZY INTEGRATION - DATABASE UPDATE
-- ============================================

-- Add LemonSqueezy-specific columns to existing tables
-- These columns will be NULL for existing PayPal data

-- Update billing_plans table to support LemonSqueezy
ALTER TABLE public.billing_plans 
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT;

-- Update subscriptions table to support LemonSqueezy
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS store_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT,
ADD COLUMN IF NOT EXISTS order_id TEXT,
ADD COLUMN IF NOT EXISTS variant_id TEXT;

-- Update subscription_events table to support LemonSqueezy events
ALTER TABLE public.subscription_events 
ADD COLUMN IF NOT EXISTS lemonsqueezy_event_id TEXT;

-- Update payment_transactions table to support LemonSqueezy (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions' AND table_schema = 'public') THEN
    ALTER TABLE public.payment_transactions 
    ADD COLUMN IF NOT EXISTS store_id TEXT,
    ADD COLUMN IF NOT EXISTS product_id TEXT,
    ADD COLUMN IF NOT EXISTS order_id TEXT,
    ADD COLUMN IF NOT EXISTS variant_id TEXT;
  END IF;
END $$;

-- ============================================
-- CREATE LEMONSQUEEZY BILLING PLANS
-- ============================================

-- Insert LemonSqueezy plans (replacing any existing PayPal plans)
INSERT INTO public.billing_plans (plan_type, provider, provider_plan_id, price_cents, currency, interval, store_id, product_id) VALUES
('starter', 'lemonsqueezy', '669764', 4900, 'USD', 'month', '233970', '669764'),
('professional', 'lemonsqueezy', '669762', 9900, 'USD', 'month', '233970', '669762'),
('enterprise', 'lemonsqueezy', '669760', 19900, 'USD', 'month', '233970', '669760')
ON CONFLICT DO NOTHING;

-- ============================================
-- ADD INDEXES FOR LEMONSQUEEZY FIELDS
-- ============================================

CREATE INDEX IF NOT EXISTS idx_billing_plans_store_id ON public.billing_plans(store_id);
CREATE INDEX IF NOT EXISTS idx_billing_plans_product_id ON public.billing_plans(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_store_id ON public.subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_product_id ON public.subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_order_id ON public.subscriptions(order_id);
-- Add indexes for payment_transactions if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_store_id ON public.payment_transactions(store_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_product_id ON public.payment_transactions(product_id);
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_order_id ON public.payment_transactions(order_id);
  END IF;
END $$;

-- ============================================
-- UPDATE HELPER FUNCTIONS FOR LEMONSQUEEZY
-- ============================================

-- Function to get LemonSqueezy product ID by plan type
CREATE OR REPLACE FUNCTION public.get_lemonsqueezy_product_id(plan_type_param TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT product_id 
    FROM public.billing_plans 
    WHERE plan_type = plan_type_param 
    AND provider = 'lemonsqueezy'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get LemonSqueezy store ID
CREATE OR REPLACE FUNCTION public.get_lemonsqueezy_store_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT store_id 
    FROM public.billing_plans 
    WHERE provider = 'lemonsqueezy'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_lemonsqueezy_product_id TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lemonsqueezy_store_id TO authenticated;
