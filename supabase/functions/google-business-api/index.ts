import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, locationId, query, startDate, endDate } = await req.json();
    
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

    // Get user's Google access token from user metadata
    const googleAccessToken = user.user_metadata?.access_token;
    if (!googleAccessToken) {
      throw new Error('No Google access token found. Please sign in with Google.');
    }

    switch (action) {
      case 'get_user_locations':
      case 'fetch_user_locations':
        return await fetchUserLocations(user.id, googleAccessToken);
      
      case 'search_locations':
        return await searchLocations(user.id, query, googleAccessToken);
      
      case 'fetch_reviews':
        return await fetchLocationReviews(locationId, googleAccessToken);
      
      case 'fetch_analytics':
        return await fetchLocationAnalytics(locationId, googleAccessToken, startDate, endDate);
      
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

async function googleApiRequest(url: string, accessToken: string, method = 'GET', params?: any) {
  const urlWithParams = params ? `${url}?${new URLSearchParams(params).toString()}` : url;
  
  const response = await fetch(urlWithParams, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google API Error: ${response.status} - ${errorText}`);
    throw new Error(`Google API request failed: ${response.status}`);
  }

  return await response.json();
}

async function getAllAccountIds(accessToken: string) {
  const data = await googleApiRequest(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    accessToken
  );

  if (!data.accounts || data.accounts.length === 0) {
    throw new Error('No Google Business accounts found');
  }

  return data.accounts.map((acc: any) => acc.name);
}

async function fetchUserLocations(userId: string, accessToken: string) {
  try {
    // Get all account IDs first
    const accountIds = await getAllAccountIds(accessToken);
    console.log('Found Google Business accounts:', accountIds);

    const allLocations = [];

    // Fetch locations for each account
    for (const accountId of accountIds) {
      let nextPageToken = null;

      do {
        const params: any = {
          readMask: 'name,title,phoneNumbers,storefrontAddress,languageCode,storeCode,categories,websiteUri,regularHours,specialHours,serviceArea,labels,latlng,openInfo,metadata,profile,moreHours,serviceItems',
          pageSize: 100,
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const data = await googleApiRequest(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
          accessToken,
          'GET',
          params
        );

        const locations = data.locations || [];
        
        // Format locations to match our interface
        const formattedLocations = locations.map((loc: any) => ({
          id: loc.name.split('/').pop(),
          google_place_id: loc.name,
          name: loc.title || 'Unknown Location',
          address: loc.storefrontAddress ? 
            `${loc.storefrontAddress.addressLines?.join(', ') || ''}, ${loc.storefrontAddress.locality || ''}, ${loc.storefrontAddress.administrativeArea || ''}`.trim() : 
            null,
          phone: loc.phoneNumbers?.primaryPhone || null,
          website: loc.websiteUri || null,
          rating: loc.metadata?.averageRating || null,
          total_reviews: loc.metadata?.newReviewCount || 0,
          latitude: loc.latlng?.latitude || null,
          longitude: loc.latlng?.longitude || null,
          status: 'active',
          last_fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        allLocations.push(...formattedLocations);
        nextPageToken = data.nextPageToken;
        
        console.log(`Fetched ${formattedLocations.length} locations from account ${accountId}`);
      } while (nextPageToken);
    }

    console.log(`Total locations fetched: ${allLocations.length}`);

    return new Response(
      JSON.stringify({ locations: allLocations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
}

async function searchLocations(userId: string, query: string, accessToken: string) {
  // For search, we'll fetch all locations and filter by query
  const response = await fetchUserLocations(userId, accessToken);
  const data = await response.json();
  
  const filteredLocations = data.locations.filter((location: any) => 
    location.name.toLowerCase().includes(query.toLowerCase()) ||
    (location.address && location.address.toLowerCase().includes(query.toLowerCase()))
  );

  return new Response(
    JSON.stringify({ locations: filteredLocations }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function fetchLocationReviews(locationId: string, accessToken: string) {
  try {
    // First get account IDs to find the full location path
    const accountIds = await getAllAccountIds(accessToken);
    
    let allReviews = [];
    
    for (const accountId of accountIds) {
      try {
        let nextPageToken = null;
        
        do {
          const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews${
            nextPageToken ? `?pageToken=${nextPageToken}` : ''
          }`;

          const data = await googleApiRequest(url, accessToken);
          
          const rawReviews = data.reviews || [];
          const formattedReviews = rawReviews.map((r: any) => ({
            id: r.reviewId,
            author_name: r.reviewer?.displayName || 'Anonymous',
            rating: r.starRating || 0,
            text: r.comment || '',
            review_date: r.createTime || new Date().toISOString(),
            ai_sentiment: null, // To be analyzed later
            ai_tags: []
          }));

          allReviews.push(...formattedReviews);
          nextPageToken = data.nextPageToken;
        } while (nextPageToken);
        
        break; // Found reviews for this location
      } catch (error) {
        console.log(`No reviews found for location ${locationId} in account ${accountId}`);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ reviews: allReviews }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching reviews:', error);
    // Return empty reviews if error
    return new Response(
      JSON.stringify({ reviews: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function fetchLocationAnalytics(locationId: string, accessToken: string, startDate?: any, endDate?: any) {
  try {
    // Default to last 30 days if no dates provided
    const today = new Date();
    const defaultEndDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
    
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultStartDate = {
      year: thirtyDaysAgo.getFullYear(),
      month: thirtyDaysAgo.getMonth() + 1,
      day: thirtyDaysAgo.getDate(),
    };

    const start = startDate || defaultStartDate;
    const end = endDate || defaultEndDate;

    const params = {
      'dailyMetrics': [
        'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
        'BUSINESS_CONVERSATIONS', 
        'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
        'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
        'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
        'BUSINESS_DIRECTION_REQUESTS',
        'CALL_CLICKS',
        'WEBSITE_CLICKS',
        'BUSINESS_BOOKINGS',
        'BUSINESS_FOOD_ORDERS',
        'BUSINESS_FOOD_MENU_CLICKS',
      ].join(','),
      'dailyRange.start_date.year': start.year.toString(),
      'dailyRange.start_date.month': start.month.toString(),
      'dailyRange.start_date.day': start.day.toString(),
      'dailyRange.end_date.year': end.year.toString(),
      'dailyRange.end_date.month': end.month.toString(),
      'dailyRange.end_date.day': end.day.toString(),
    };

    const url = `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`;
    const response = await googleApiRequest(url, accessToken, 'GET', params);

    return new Response(
      JSON.stringify({ analytics: response }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching analytics:', error);
    // Return empty analytics if error
    return new Response(
      JSON.stringify({ analytics: {} }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}