-- ============================================
-- CREATE WAITLIST TABLE FOR PRE-LAUNCH SIGNUPS
-- ============================================
-- Stores email addresses of people interested in Dibiex before launch

CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Contact info
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  
  -- Business details (optional)
  business_type TEXT, -- 'restaurant', 'hotel', 'medical', 'salon', 'retail', 'other'
  location_count INTEGER, -- How many locations they have
  current_review_count INTEGER, -- Approximate number of reviews
  
  -- Tracking
  source TEXT, -- Where they came from (e.g., 'google_ads', 'facebook', 'organic')
  referral_code TEXT, -- If referred by someone
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'onboarded', 'declined')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Admin notes
  notes TEXT,
  contacted_at TIMESTAMP WITH TIME ZONE,
  contacted_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_status ON public.waitlist(status);
CREATE INDEX idx_waitlist_priority ON public.waitlist(priority);
CREATE INDEX idx_waitlist_created_at ON public.waitlist(created_at DESC);
CREATE INDEX idx_waitlist_business_type ON public.waitlist(business_type);

-- Enable RLS (but allow public inserts for signup form)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for signup form)
CREATE POLICY "Anyone can signup to waitlist" 
ON public.waitlist 
FOR INSERT 
WITH CHECK (true);

-- Policy: Only admins can view (service role)
CREATE POLICY "Only service role can view waitlist" 
ON public.waitlist 
FOR SELECT 
USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Only admins can update
CREATE POLICY "Only service role can update waitlist" 
ON public.waitlist 
FOR UPDATE 
USING (auth.jwt()->>'role' = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_waitlist_updated_at
BEFORE UPDATE ON public.waitlist
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Success message
SELECT '✅ Waitlist table created successfully!' as status;

