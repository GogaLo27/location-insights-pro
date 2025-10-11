-- ============================================
-- LOCATION ANALYTICS CACHE TABLE
-- Pre-computed analytics for instant dashboard loading
-- ============================================

CREATE TABLE IF NOT EXISTS public.location_analytics_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT NOT NULL,
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT DEFAULT 'month' CHECK (period_type IN ('day', 'week', 'month', 'year', 'all')),
  
  -- Review counts
  total_reviews INTEGER DEFAULT 0,
  new_reviews_count INTEGER DEFAULT 0,
  
  -- Rating stats
  average_rating DECIMAL(3,2),
  rating_1_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,
  
  -- Sentiment stats
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  positive_percentage DECIMAL(5,2),
  negative_percentage DECIMAL(5,2),
  neutral_percentage DECIMAL(5,2),
  
  -- Response stats
  replied_count INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2),
  avg_response_time_hours DECIMAL(10,2),
  
  -- Trending
  rating_trend TEXT, -- 'up', 'down', 'stable'
  review_velocity INTEGER, -- reviews per day
  
  -- Top tags
  top_positive_tags TEXT[],
  top_negative_tags TEXT[],
  
  -- Metadata
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, location_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.location_analytics_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analytics cache" 
ON public.location_analytics_cache FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics cache" 
ON public.location_analytics_cache FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics cache" 
ON public.location_analytics_cache FOR UPDATE 
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_analytics_cache_user_location 
ON location_analytics_cache(user_id, location_id);

CREATE INDEX idx_analytics_cache_period 
ON location_analytics_cache(location_id, period_type, period_end DESC);

CREATE INDEX idx_analytics_cache_computed 
ON location_analytics_cache(computed_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_analytics_cache_updated_at
BEFORE UPDATE ON public.location_analytics_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FUNCTION: Compute analytics for a location
-- ============================================

CREATE OR REPLACE FUNCTION compute_location_analytics(
  p_user_id UUID,
  p_location_id TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_period_type TEXT DEFAULT 'month'
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_total_reviews INTEGER;
  v_avg_rating DECIMAL(3,2);
  v_positive INTEGER;
  v_negative INTEGER;
  v_neutral INTEGER;
  v_replied INTEGER;
  v_rating_counts INTEGER[];
BEGIN
  -- Get review counts by rating
  SELECT 
    COUNT(*),
    ROUND(AVG(rating)::numeric, 2),
    ARRAY[
      COUNT(*) FILTER (WHERE rating = 1),
      COUNT(*) FILTER (WHERE rating = 2),
      COUNT(*) FILTER (WHERE rating = 3),
      COUNT(*) FILTER (WHERE rating = 4),
      COUNT(*) FILTER (WHERE rating = 5)
    ]
  INTO v_total_reviews, v_avg_rating, v_rating_counts
  FROM saved_reviews
  WHERE user_id = p_user_id
  AND location_id = p_location_id
  AND review_date::date BETWEEN p_period_start AND p_period_end;
  
  -- Get sentiment counts
  SELECT 
    COUNT(*) FILTER (WHERE ai_sentiment = 'positive'),
    COUNT(*) FILTER (WHERE ai_sentiment = 'negative'),
    COUNT(*) FILTER (WHERE ai_sentiment = 'neutral')
  INTO v_positive, v_negative, v_neutral
  FROM saved_reviews
  WHERE user_id = p_user_id
  AND location_id = p_location_id
  AND review_date::date BETWEEN p_period_start AND p_period_end
  AND ai_sentiment IS NOT NULL;
  
  -- Get reply count
  SELECT COUNT(*) INTO v_replied
  FROM saved_reviews
  WHERE user_id = p_user_id
  AND location_id = p_location_id
  AND review_date::date BETWEEN p_period_start AND p_period_end
  AND reply_text IS NOT NULL;
  
  -- Insert or update cache
  INSERT INTO location_analytics_cache (
    user_id,
    location_id,
    period_start,
    period_end,
    period_type,
    total_reviews,
    average_rating,
    rating_1_count,
    rating_2_count,
    rating_3_count,
    rating_4_count,
    rating_5_count,
    positive_count,
    negative_count,
    neutral_count,
    positive_percentage,
    negative_percentage,
    neutral_percentage,
    replied_count,
    response_rate,
    computed_at
  ) VALUES (
    p_user_id,
    p_location_id,
    p_period_start,
    p_period_end,
    p_period_type,
    v_total_reviews,
    v_avg_rating,
    v_rating_counts[1],
    v_rating_counts[2],
    v_rating_counts[3],
    v_rating_counts[4],
    v_rating_counts[5],
    v_positive,
    v_negative,
    v_neutral,
    CASE WHEN v_total_reviews > 0 THEN ROUND((v_positive::numeric / v_total_reviews * 100)::numeric, 2) ELSE 0 END,
    CASE WHEN v_total_reviews > 0 THEN ROUND((v_negative::numeric / v_total_reviews * 100)::numeric, 2) ELSE 0 END,
    CASE WHEN v_total_reviews > 0 THEN ROUND((v_neutral::numeric / v_total_reviews * 100)::numeric, 2) ELSE 0 END,
    v_replied,
    CASE WHEN v_total_reviews > 0 THEN ROUND((v_replied::numeric / v_total_reviews * 100)::numeric, 2) ELSE 0 END,
    NOW()
  )
  ON CONFLICT (user_id, location_id, period_start, period_end)
  DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    rating_1_count = EXCLUDED.rating_1_count,
    rating_2_count = EXCLUDED.rating_2_count,
    rating_3_count = EXCLUDED.rating_3_count,
    rating_4_count = EXCLUDED.rating_4_count,
    rating_5_count = EXCLUDED.rating_5_count,
    positive_count = EXCLUDED.positive_count,
    negative_count = EXCLUDED.negative_count,
    neutral_count = EXCLUDED.neutral_count,
    positive_percentage = EXCLUDED.positive_percentage,
    negative_percentage = EXCLUDED.negative_percentage,
    neutral_percentage = EXCLUDED.neutral_percentage,
    replied_count = EXCLUDED.replied_count,
    response_rate = EXCLUDED.response_rate,
    computed_at = NOW(),
    updated_at = NOW()
  RETURNING row_to_json(location_analytics_cache.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION compute_location_analytics TO authenticated;

DO $$
BEGIN
    RAISE NOTICE '✅ location_analytics_cache table created!';
    RAISE NOTICE '📊 Analytics will now be instant (pre-computed)';
END $$;

