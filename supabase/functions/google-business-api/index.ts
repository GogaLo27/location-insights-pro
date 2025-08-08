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
    const { action, locationId, placeId, query } = await req.json();
    
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
      case 'get_user_locations':
      case 'fetch_user_locations':
        return await fetchUserLocations(user.id);
      
      case 'search_locations':
        return await searchLocations(user.id, query);
      
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
      phone: '+1-555-0123',
      website: 'https://demo-restaurant.com',
      rating: 4.5,
      total_reviews: 125,
      latitude: 40.7128,
      longitude: -74.0060,
      status: 'active',
      last_fetched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'loc_2',
      google_place_id: 'ChIJ456example',
      name: 'Sample Cafe',
      address: '456 Oak Ave, City, State',
      phone: '+1-555-0456',
      website: 'https://sample-cafe.com',
      rating: 4.2,
      total_reviews: 89,
      latitude: 40.7580,
      longitude: -73.9855,
      status: 'active',
      last_fetched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  return new Response(
    JSON.stringify({ locations: mockLocations }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function searchLocations(userId: string, query: string) {
  // Mock search results based on query
  const searchResults = [
    {
      id: `loc_${Date.now()}`,
      google_place_id: `search_${Date.now()}`,
      name: `${query} - Search Result`,
      address: '789 Search St, Query City, State',
      phone: '+1-555-0789',
      website: null,
      rating: 4.3,
      total_reviews: 67,
      latitude: 40.7614,
      longitude: -73.9776,
      status: 'active',
      last_fetched_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  return new Response(
    JSON.stringify({ locations: searchResults }),
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