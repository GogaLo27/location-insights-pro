-- Create review_templates table
CREATE TABLE IF NOT EXISTS public.review_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('positive', 'negative', 'neutral', 'thank_you', 'apology', 'follow_up')),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_prebuilt BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_templates_user_id ON public.review_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_review_templates_category ON public.review_templates(category);
CREATE INDEX IF NOT EXISTS idx_review_templates_is_prebuilt ON public.review_templates(is_prebuilt);

-- Enable RLS
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own templates and prebuilt templates" ON public.review_templates
  FOR SELECT USING (
    auth.uid() = user_id OR is_prebuilt = true
  );

CREATE POLICY "Users can insert their own templates" ON public.review_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON public.review_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON public.review_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Insert prebuilt templates
INSERT INTO public.review_templates (name, category, content, variables, is_prebuilt, is_default) VALUES
-- Positive review templates
('Thank You - Positive Review', 'positive', 'Thank you so much for your wonderful review, {customer_name}! We''re thrilled to hear that you had such a positive experience with us. Your feedback means the world to our team and helps us continue providing excellent service. We look forward to serving you again soon!', '["customer_name"]', true, true),

('Grateful Response', 'positive', 'We''re so grateful for your kind words, {customer_name}! It''s reviews like yours that motivate our team to keep delivering exceptional experiences. Thank you for taking the time to share your feedback - it truly makes a difference!', '["customer_name"]', true, false),

-- Negative review templates
('Apology - Service Issue', 'negative', 'We sincerely apologize for the disappointing experience you had, {customer_name}. This is not the level of service we strive to provide, and we take your feedback very seriously. We would love the opportunity to make this right and regain your trust. Please contact us directly so we can address your concerns personally.', '["customer_name"]', true, true),

('Resolution Offer', 'negative', 'Thank you for bringing this to our attention, {customer_name}. We''re truly sorry that we didn''t meet your expectations. Your feedback is valuable to us and helps us improve. We''d appreciate the chance to discuss this with you directly and find a solution that works for you.', '["customer_name"]', true, false),

-- Neutral review templates
('Appreciation - Neutral', 'neutral', 'Thank you for taking the time to share your feedback, {customer_name}. We appreciate your honest review and are always looking for ways to improve our service. We hope to exceed your expectations on your next visit!', '["customer_name"]', true, true),

-- Thank you templates
('General Thank You', 'thank_you', 'Thank you for your review, {customer_name}! We appreciate you taking the time to share your experience with us. Your feedback helps us continue to improve and serve our customers better.', '["customer_name"]', true, true),

-- Apology templates
('General Apology', 'apology', 'We apologize for any inconvenience you may have experienced, {customer_name}. Your satisfaction is important to us, and we''d like to make things right. Please don''t hesitate to reach out to us directly.', '["customer_name"]', true, false),

-- Follow-up templates
('Follow-up Response', 'follow_up', 'Thank you for your review, {customer_name}. We''ve noted your feedback and would love to follow up with you personally. Please feel free to contact us if you have any additional thoughts or concerns.', '["customer_name"]', true, false);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_review_templates_updated_at 
    BEFORE UPDATE ON public.review_templates 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
