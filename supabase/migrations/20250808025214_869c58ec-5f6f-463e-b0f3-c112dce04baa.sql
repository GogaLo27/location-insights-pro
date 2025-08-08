-- Create table for storing user's selected location
CREATE TABLE public.user_selected_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_place_id TEXT NOT NULL,
  location_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_selected_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own selected location" 
ON public.user_selected_locations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own selected location" 
ON public.user_selected_locations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own selected location" 
ON public.user_selected_locations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own selected location" 
ON public.user_selected_locations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_selected_locations_updated_at
BEFORE UPDATE ON public.user_selected_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();