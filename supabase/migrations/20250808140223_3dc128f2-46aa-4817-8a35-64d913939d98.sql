-- Add new columns to saved_reviews table for enhanced AI analysis
ALTER TABLE public.saved_reviews 
ADD COLUMN IF NOT EXISTS ai_issues TEXT[],
ADD COLUMN IF NOT EXISTS ai_suggestions TEXT[];