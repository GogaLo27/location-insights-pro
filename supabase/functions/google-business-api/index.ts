import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, locationId, placeId } = await req.json();
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    switch (action) {
      case 'fetch_locations':
        return await fetchUserLocations(user.id);
      
      case 'add_location':
        return await addLocation(user.id, placeId);
      
      case 'fetch_reviews':
        return await fetchLocationReviews(locationId);
      
      case 'fetch_analytics':
        return await fetchLocationAnalytics(locationId);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in google-business-api function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function fetchUserLocations(userId: string) {
  // For now, return mock data since we need Google Business API setup
  const mockLocations = [
    {
      id: 'loc_1',
      google_place_id: 'ChIJ123example',
      name: 'Demo Restaurant',
      address: '123 Main St, City, State',
      rating: 4.5,
      total_reviews: 125,
      status: 'active'
    }
  ];

  return new Response(
    JSON.stringify({ locations: mockLocations }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function addLocation(userId: string, placeId: string) {
  // Mock implementation - in production this would use Google Places API
  const mockLocation = {
    id: `loc_${Date.now()}`,
    google_place_id: placeId,
    name: 'New Location',
    address: 'To be fetched from Google',
    rating: 0,
    total_reviews: 0,
    status: 'active'
  };

  return new Response(
    JSON.stringify({ location: mockLocation }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function fetchLocationReviews(locationId: string) {
  // Mock reviews data
  const mockReviews = [
    {
      id: 'rev_1',
      author_name: 'John Doe',
      rating: 5,
      text: 'Great service and food!',
      review_date: new Date().toISOString(),
      ai_sentiment: 'positive',
      ai_tags: ['service', 'food', 'quality']
    }
  ];

  return new Response(
    JSON.stringify({ reviews: mockReviews }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function fetchLocationAnalytics(locationId: string) {
  // Mock analytics data
  const mockAnalytics = {
    views: 1234,
    searches: 567,
    website_clicks: 89,
    direction_clicks: 234,
    phone_calls: 45
  };

  return new Response(
    JSON.stringify({ analytics: mockAnalytics }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}