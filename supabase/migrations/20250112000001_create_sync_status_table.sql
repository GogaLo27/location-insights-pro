-- ============================================
-- LOCATION SYNC STATUS TABLE
-- Tracks when each location was last synced from Google
-- ============================================

CREATE TABLE IF NOT EXISTS public.location_sync_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'failed')),
  total_reviews_synced INTEGER DEFAULT 0,
  new_reviews_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, location_id)
);

-- Enable RLS
ALTER TABLE public.location_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sync status" 
ON public.location_sync_status FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync status" 
ON public.location_sync_status FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync status" 
ON public.location_sync_status FOR UPDATE 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_location_sync_user_location 
ON location_sync_status(user_id, location_id);

CREATE INDEX idx_location_sync_status 
ON location_sync_status(sync_status) 
WHERE sync_status IN ('pending', 'syncing');

CREATE INDEX idx_location_sync_date 
ON location_sync_status(last_synced_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_location_sync_status_updated_at
BEFORE UPDATE ON public.location_sync_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to get or create sync status
CREATE OR REPLACE FUNCTION get_or_create_sync_status(
  p_user_id UUID,
  p_location_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  -- Try to get existing
  SELECT id INTO v_sync_id
  FROM location_sync_status
  WHERE user_id = p_user_id AND location_id = p_location_id;
  
  -- Create if doesn't exist
  IF v_sync_id IS NULL THEN
    INSERT INTO location_sync_status (user_id, location_id)
    VALUES (p_user_id, p_location_id)
    RETURNING id INTO v_sync_id;
  END IF;
  
  RETURN v_sync_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update sync status
CREATE OR REPLACE FUNCTION update_sync_status(
  p_user_id UUID,
  p_location_id TEXT,
  p_status TEXT,
  p_new_reviews_count INTEGER DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO location_sync_status (
    user_id,
    location_id,
    last_synced_at,
    sync_status,
    new_reviews_count,
    error_message,
    total_reviews_synced
  )
  VALUES (
    p_user_id,
    p_location_id,
    CASE WHEN p_status = 'success' THEN NOW() ELSE NULL END,
    p_status,
    p_new_reviews_count,
    p_error_message,
    p_new_reviews_count
  )
  ON CONFLICT (user_id, location_id)
  DO UPDATE SET
    last_synced_at = CASE WHEN p_status = 'success' THEN NOW() ELSE location_sync_status.last_synced_at END,
    sync_status = p_status,
    new_reviews_count = p_new_reviews_count,
    error_message = p_error_message,
    total_reviews_synced = location_sync_status.total_reviews_synced + p_new_reviews_count,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_sync_status TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ location_sync_status table created!';
    RAISE NOTICE '🔄 Ready for incremental sync tracking';
END $$;

