-- Create competitors table
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  google_place_id TEXT,
  address TEXT,
  phone TEXT,
  website TEXT,
  category TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitor reviews table
CREATE TABLE competitor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  google_review_id TEXT,
  author_name TEXT,
  rating INTEGER,
  text TEXT,
  review_date TIMESTAMP WITH TIME ZONE,
  reply_text TEXT,
  reply_date TIMESTAMP WITH TIME ZONE,
  ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'negative', 'neutral')),
  ai_tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create competitor analytics table
CREATE TABLE competitor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  date DATE,
  average_rating DECIMAL(3,2),
  total_reviews INTEGER,
  positive_reviews INTEGER,
  negative_reviews INTEGER,
  neutral_reviews INTEGER,
  response_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_competitors_user_id ON competitors(user_id);
CREATE INDEX idx_competitors_google_place_id ON competitors(google_place_id);
CREATE INDEX idx_competitor_reviews_competitor_id ON competitor_reviews(competitor_id);
CREATE INDEX idx_competitor_reviews_review_date ON competitor_reviews(review_date);
CREATE INDEX idx_competitor_analytics_competitor_id ON competitor_analytics(competitor_id);
CREATE INDEX idx_competitor_analytics_date ON competitor_analytics(date);

-- Enable Row Level Security
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own competitors" ON competitors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own competitors" ON competitors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own competitors" ON competitors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own competitors" ON competitors
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view competitor reviews for their competitors" ON competitor_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM competitors 
      WHERE competitors.id = competitor_reviews.competitor_id 
      AND competitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert competitor reviews for their competitors" ON competitor_reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitors 
      WHERE competitors.id = competitor_reviews.competitor_id 
      AND competitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view competitor analytics for their competitors" ON competitor_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM competitors 
      WHERE competitors.id = competitor_analytics.competitor_id 
      AND competitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert competitor analytics for their competitors" ON competitor_analytics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitors 
      WHERE competitors.id = competitor_analytics.competitor_id 
      AND competitors.user_id = auth.uid()
    )
  );
