-- ============================================
-- UPDATE TO PAYPAL LIVE MODE
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- Update Starter Plan with Live IDs
UPDATE public.billing_plans 
SET 
  paypal_product_id = 'P-5ES63805M0384800YNEBEWKY',  -- ⚠️ Replace with actual Product ID if different from Plan ID
  paypal_plan_id = 'P-5ES63805M0384800YNEBEWKY',
  provider_plan_id = 'P-5ES63805M0384800YNEBEWKY',
  updated_at = NOW()
WHERE plan_type = 'starter' AND provider = 'paypal';

-- Update Professional Plan with Live IDs
UPDATE public.billing_plans 
SET 
  paypal_product_id = 'P-8V5378043G890262XNEBEWXQ',  -- ⚠️ Replace with actual Product ID if different from Plan ID
  paypal_plan_id = 'P-8V5378043G890262XNEBEWXQ',
  provider_plan_id = 'P-8V5378043G890262XNEBEWXQ',
  updated_at = NOW()
WHERE plan_type = 'professional' AND provider = 'paypal';

-- Update Enterprise Plan with Live IDs
UPDATE public.billing_plans 
SET 
  paypal_product_id = 'P-1MF83801482161036NEBEXCQ',  -- ⚠️ Replace with actual Product ID if different from Plan ID
  paypal_plan_id = 'P-1MF83801482161036NEBEXCQ',
  provider_plan_id = 'P-1MF83801482161036NEBEXCQ',
  updated_at = NOW()
WHERE plan_type = 'enterprise' AND provider = 'paypal';

-- ============================================
-- VERIFICATION QUERY
-- Run this to verify the updates were successful
-- ============================================
SELECT 
  plan_type, 
  provider, 
  paypal_product_id, 
  paypal_plan_id, 
  provider_plan_id, 
  price_cents,
  currency,
  interval,
  updated_at
FROM public.billing_plans 
WHERE provider = 'paypal'
ORDER BY 
  CASE plan_type
    WHEN 'starter' THEN 1
    WHEN 'professional' THEN 2
    WHEN 'enterprise' THEN 3
  END;

