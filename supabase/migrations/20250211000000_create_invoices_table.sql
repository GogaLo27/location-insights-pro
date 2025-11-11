-- ============================================
-- CREATE INVOICES TABLE
-- ============================================
-- Stores invoice records for user subscriptions

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  
  -- Invoice identification
  invoice_number TEXT NOT NULL UNIQUE, -- e.g., "INV-2025-001234"
  
  -- Payment details
  paypal_transaction_id TEXT,
  lemonsqueezy_order_id TEXT,
  payment_method TEXT NOT NULL, -- 'paypal', 'lemonsqueezy', 'manual'
  
  -- Amount
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  
  -- Plan details
  plan_type TEXT NOT NULL CHECK (plan_type IN ('starter', 'professional', 'enterprise')),
  plan_name TEXT,
  
  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  
  -- Customer info (snapshot at time of purchase)
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_company TEXT,
  
  -- Billing details
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  
  -- PDF storage
  pdf_url TEXT, -- Will be null initially, populated after PDF generation
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies for users
CREATE POLICY "Users can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policies for admins (service role)
CREATE POLICY "Service role can manage all invoices" 
ON public.invoices 
FOR ALL 
USING (auth.jwt()->>'role' = 'service_role');

-- Indexes for performance
CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX idx_invoices_paypal_transaction ON public.invoices(paypal_transaction_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_invoice_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  -- Get count of invoices this year
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.invoices
  WHERE EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM NOW());
  
  -- Format: INV-2025-001234
  v_invoice_number := 'INV-' || v_year || '-' || LPAD(v_count::TEXT, 6, '0');
  
  RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT '✅ Invoices table created successfully!' as status;

