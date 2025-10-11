-- ============================================
-- AI ANALYSIS JOBS TABLE
-- Tracks AI analysis jobs for background processing
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  
  -- Job details
  job_type TEXT DEFAULT 'review_analysis' CHECK (job_type IN ('review_analysis', 'sentiment_analysis', 'bulk_analysis')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  progress_percentage INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN total_items > 0 THEN (processed_items * 100 / total_items)
      ELSE 0
    END
  ) STORED,
  
  -- Review IDs to process
  review_ids UUID[],
  
  -- Results
  results JSONB,
  error_message TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.ai_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own jobs" 
ON public.ai_analysis_jobs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" 
ON public.ai_analysis_jobs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
ON public.ai_analysis_jobs FOR UPDATE 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_ai_jobs_user_id 
ON ai_analysis_jobs(user_id);

CREATE INDEX idx_ai_jobs_status 
ON ai_analysis_jobs(status) 
WHERE status IN ('pending', 'processing');

CREATE INDEX idx_ai_jobs_location 
ON ai_analysis_jobs(location_id, created_at DESC);

CREATE INDEX idx_ai_jobs_created 
ON ai_analysis_jobs(created_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_ai_jobs_updated_at
BEFORE UPDATE ON public.ai_analysis_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Create AI analysis job
CREATE OR REPLACE FUNCTION create_ai_analysis_job(
  p_user_id UUID,
  p_location_id TEXT,
  p_review_ids UUID[]
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO ai_analysis_jobs (
    user_id,
    location_id,
    job_type,
    status,
    total_items,
    review_ids
  ) VALUES (
    p_user_id,
    p_location_id,
    'review_analysis',
    'pending',
    array_length(p_review_ids, 1),
    p_review_ids
  )
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update job progress
CREATE OR REPLACE FUNCTION update_ai_job_progress(
  p_job_id UUID,
  p_processed_count INTEGER,
  p_failed_count INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  UPDATE ai_analysis_jobs
  SET 
    processed_items = p_processed_count,
    failed_items = p_failed_count,
    status = CASE 
      WHEN p_processed_count + p_failed_count >= total_items THEN 'completed'
      ELSE 'processing'
    END,
    completed_at = CASE 
      WHEN p_processed_count + p_failed_count >= total_items THEN NOW()
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending jobs
CREATE OR REPLACE FUNCTION get_pending_ai_jobs(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  job_id UUID,
  user_id UUID,
  location_id TEXT,
  review_ids UUID[],
  total_items INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    ai_analysis_jobs.user_id,
    ai_analysis_jobs.location_id,
    ai_analysis_jobs.review_ids,
    ai_analysis_jobs.total_items
  FROM ai_analysis_jobs
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT p_limit;
  
  -- Mark as processing
  UPDATE ai_analysis_jobs
  SET status = 'processing', started_at = NOW()
  WHERE id IN (
    SELECT id FROM ai_analysis_jobs
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT p_limit
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel job
CREATE OR REPLACE FUNCTION cancel_ai_job(p_job_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE ai_analysis_jobs
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = p_job_id
  AND status IN ('pending', 'processing')
  AND user_id = auth.uid();
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_ai_analysis_job TO authenticated;
GRANT EXECUTE ON FUNCTION update_ai_job_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_ai_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_ai_job TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ ai_analysis_jobs table created!';
    RAISE NOTICE '⚙️ Ready for background AI processing';
END $$;

