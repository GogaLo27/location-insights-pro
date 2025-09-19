-- Create brand_profiles table for white-label reports
CREATE TABLE public.brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT, -- Optional: link to specific location
  brand_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#666666',
  font_family TEXT DEFAULT 'Arial, sans-serif',
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_brand_profiles_user_id ON public.brand_profiles(user_id);
CREATE INDEX idx_brand_profiles_location_id ON public.brand_profiles(location_id);
CREATE INDEX idx_brand_profiles_is_default ON public.brand_profiles(is_default);

-- Enable RLS
ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own brand profiles" 
ON public.brand_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand profiles" 
ON public.brand_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand profiles" 
ON public.brand_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brand profiles" 
ON public.brand_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_brand_profiles_updated_at
BEFORE UPDATE ON public.brand_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add brand_id column to user_locations table
ALTER TABLE public.user_locations 
ADD COLUMN brand_id UUID REFERENCES public.brand_profiles(id) ON DELETE SET NULL;

-- Create index for brand_id
CREATE INDEX idx_user_locations_brand_id ON public.user_locations(brand_id);
