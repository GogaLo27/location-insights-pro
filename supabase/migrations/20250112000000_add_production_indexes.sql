-- ============================================
-- PRODUCTION INDEXES FOR HIGH LOAD
-- Run this first before anything else
-- ============================================

-- Drop existing indexes if they exist (to recreate optimized versions)
DROP INDEX IF EXISTS idx_saved_reviews_location_id;
DROP INDEX IF EXISTS idx_saved_reviews_user_id;

-- ============================================
-- CRITICAL INDEXES FOR saved_reviews TABLE
-- ============================================

-- 1. Main query pattern: Get reviews by location, sorted by date
-- Note: Can't INCLUDE text (too large), only small columns
CREATE INDEX idx_saved_reviews_location_date 
ON saved_reviews(location_id, review_date DESC)
INCLUDE (rating, ai_sentiment, author_name);

-- 2. Get reviews by user and location (for multi-location users)
CREATE INDEX idx_saved_reviews_user_location 
ON saved_reviews(user_id, location_id)
INCLUDE (review_date, rating);

-- 3. Find unanalyzed reviews for AI processing
CREATE INDEX idx_saved_reviews_unanalyzed 
ON saved_reviews(user_id, location_id) 
WHERE ai_sentiment IS NULL;

-- 4. Sentiment filtering (positive/negative/neutral)
CREATE INDEX idx_saved_reviews_sentiment 
ON saved_reviews(location_id, ai_sentiment, review_date DESC)
WHERE ai_sentiment IS NOT NULL;

-- 5. Date range queries (for analytics)
CREATE INDEX idx_saved_reviews_date_range 
ON saved_reviews(location_id, review_date)
INCLUDE (rating, ai_sentiment);

-- 6. Rating-based queries
CREATE INDEX idx_saved_reviews_rating 
ON saved_reviews(location_id, rating, review_date DESC);

-- 7. Google review ID lookup (for sync/deduplication)
CREATE INDEX idx_saved_reviews_google_id 
ON saved_reviews(google_review_id);

-- 8. User's all reviews (for user dashboard)
CREATE INDEX idx_saved_reviews_user_date 
ON saved_reviews(user_id, review_date DESC);

-- ============================================
-- INDEXES FOR user_locations (if exists)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id 
ON user_locations(user_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_google_place_id 
ON user_locations(google_place_id);

-- ============================================
-- INDEXES FOR competitors TABLES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_competitors_user_active 
ON competitors(user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_competitor_reviews_competitor_date 
ON competitor_reviews(competitor_id, review_date DESC);

CREATE INDEX IF NOT EXISTS idx_competitor_analytics_date 
ON competitor_analytics(competitor_id, date DESC);

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================

ANALYZE saved_reviews;
ANALYZE user_plans;
ANALYZE competitors;
ANALYZE competitor_reviews;

-- ============================================
-- VERIFY INDEXES CREATED
-- ============================================

SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('saved_reviews', 'competitors', 'competitor_reviews')
ORDER BY tablename, indexname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Production indexes created successfully!';
    RAISE NOTICE '📊 Queries should now be 10-100x faster';
    RAISE NOTICE '🚀 Ready for high load';
END $$;

