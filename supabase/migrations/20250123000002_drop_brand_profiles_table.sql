-- Drop the existing brand_profiles table and related objects
-- This will remove all data, so make sure to backup if needed

-- Drop the foreign key constraint first
ALTER TABLE public.user_locations DROP CONSTRAINT IF EXISTS user_locations_brand_id_fkey;

-- Drop the index
DROP INDEX IF EXISTS idx_user_locations_brand_id;

-- Drop the brand_id column from user_locations
ALTER TABLE public.user_locations DROP COLUMN IF EXISTS brand_id;

-- Drop the brand_profiles table
DROP TABLE IF EXISTS public.brand_profiles CASCADE;

-- Drop the storage bucket and policies if they exist
DROP POLICY IF EXISTS "Users can upload their own brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own brand logos" ON storage.objects;

-- Delete the storage bucket
DELETE FROM storage.buckets WHERE id = 'brand-logos';
