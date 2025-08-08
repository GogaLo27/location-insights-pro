-- Create table for storing AI review analyses
CREATE TABLE public.review_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'negative', 'neutral')),
  ai_tags TEXT[],
  ai_summary TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.review_analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own review analyses" 
ON public.review_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own review analyses" 
ON public.review_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own review analyses" 
ON public.review_analyses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_review_analyses_review_id ON public.review_analyses(review_id);
CREATE INDEX idx_review_analyses_user_id ON public.review_analyses(user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_review_analyses_updated_at
BEFORE UPDATE ON public.review_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();