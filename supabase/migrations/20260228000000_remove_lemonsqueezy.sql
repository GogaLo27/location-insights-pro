-- Remove LemonSqueezy integration (no longer in use)
-- Drops helper functions and optionally cleans up lemonsqueezy billing plans

-- Drop LemonSqueezy helper functions (no longer used)
DROP FUNCTION IF EXISTS public.get_lemonsqueezy_product_id(TEXT);
DROP FUNCTION IF EXISTS public.get_lemonsqueezy_store_id();

-- Delete lemonsqueezy billing plans (optional cleanup - they are no longer used)
DELETE FROM public.billing_plans WHERE provider = 'lemonsqueezy';
