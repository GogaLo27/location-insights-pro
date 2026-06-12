-- ============================================
-- DODO PAYMENTS INTEGRATION
-- ============================================
-- Replaces Keepz and PayPal as the sole payment provider.
-- Dodo is a Merchant of Record (MoR) with hosted checkout.

-- Add Dodo-specific columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS dodo_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS dodo_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_dodo_subscription_id
  ON public.subscriptions(dodo_subscription_id);

-- Add Dodo product ID to billing_plans
ALTER TABLE public.billing_plans
  ADD COLUMN IF NOT EXISTS dodo_product_id TEXT;

-- Add Dodo payment ID to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS dodo_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_dodo_payment_id
  ON public.invoices(dodo_payment_id);

-- Add Dodo event ID to subscription_events
ALTER TABLE public.subscription_events
  ADD COLUMN IF NOT EXISTS dodo_event_id TEXT;

-- ============================================
-- DEACTIVATE LEGACY PLANS
-- ============================================

UPDATE public.billing_plans
  SET is_active = false
  WHERE provider IN ('keepz', 'paypal');

-- ============================================
-- SEED DODO BILLING PLANS
-- ============================================
-- Fill in the actual dodo_product_id values from your Dodo dashboard
-- and update price_cents to match what you configured in Dodo.

INSERT INTO public.billing_plans (
  plan_type,
  provider,
  provider_plan_id,
  dodo_product_id,
  plan_name,
  plan_description,
  price_cents,
  currency,
  interval,
  features,
  is_active,
  sort_order,
  trial_days,
  max_locations,
  support_level
) VALUES
  (
    'starter',
    'dodo',
    'pdt_0NguK1oaakz86IE4gnEpY',
    'pdt_0NguK1oaakz86IE4gnEpY',
    'Starter Monthly',
    'Perfect for small businesses managing one location',
    4900,
    'USD',
    'month',
    '["1 location", "30 days analytics", "Review management", "CSV export", "Email support"]'::jsonb,
    true,
    1,
    0,
    1,
    'email'
  ),
  (
    'professional',
    'dodo',
    'pdt_0NguKBjYU8uNUYsNgQyRB',
    'pdt_0NguKBjYU8uNUYsNgQyRB',
    'Professional Monthly',
    'For growing businesses with multiple locations',
    9900,
    'USD',
    'month',
    '["Up to 5 locations", "365 days analytics", "AI sentiment analysis", "AI reply generation", "PDF export", "Priority support", "Competitor analysis"]'::jsonb,
    true,
    2,
    0,
    5,
    'priority'
  ),
  (
    'enterprise',
    'dodo',
    'pdt_0NgtZVjNiByqEG9GrfAFs',
    'pdt_0NgtZVjNiByqEG9GrfAFs',
    'Enterprise Monthly',
    'Unlimited scale for large organizations',
    19900,
    'USD',
    'month',
    '["Unlimited locations", "All analytics features", "All AI features", "All export formats", "24/7 dedicated support", "Custom integrations", "Competitor analysis"]'::jsonb,
    true,
    3,
    0,
    NULL,
    'dedicated'
  )
ON CONFLICT DO NOTHING;
