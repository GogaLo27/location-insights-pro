-- Invoices: add Keepz support, remove Lemon Squeezy
-- generate-invoice will set keepz_order_id when payment_method = 'keepz'

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS keepz_order_id TEXT;

-- Drop Lemon Squeezy column (no longer used)
ALTER TABLE public.invoices
  DROP COLUMN IF EXISTS lemonsqueezy_order_id;

CREATE INDEX IF NOT EXISTS idx_invoices_keepz_order ON public.invoices(keepz_order_id);
