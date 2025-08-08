-- Create table for storing reviews with AI analysis in database
CREATE TABLE IF NOT EXISTS public.saved_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  google_review_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  text TEXT,
  review_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reply_text TEXT,
  reply_date TIMESTAMP WITH TIME ZONE,
  ai_sentiment TEXT,
  ai_tags TEXT[],
  ai_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, google_review_id)
);

-- Enable RLS
ALTER TABLE public.saved_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own saved reviews" 
ON public.saved_reviews FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved reviews" 
ON public.saved_reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved reviews" 
ON public.saved_reviews FOR UPDATE 
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_saved_reviews_updated_at
BEFORE UPDATE ON public.saved_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();