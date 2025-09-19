-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('brand-logos', 'brand-logos', true);

-- Create storage policies for brand logos
CREATE POLICY "Users can upload their own brand logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own brand logos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own brand logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own brand logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'brand-logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
