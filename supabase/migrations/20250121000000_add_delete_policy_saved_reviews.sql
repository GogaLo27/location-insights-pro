-- Add missing DELETE policy for saved_reviews table
CREATE POLICY "Users can delete their own saved reviews" 
ON public.saved_reviews FOR DELETE 
USING (auth.uid() = user_id);
