// /supabase/functions/google-business-api/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-google-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// scopes needed: https://www.googleapis.com/auth/business.manage
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Add overall timeout for the entire request
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Function timeout')), 120000) // 2 minute timeout
  );

  try {
    const result = await Promise.race([
      handleRequest(req),
      timeoutPromise
    ]);
    return result;
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Internal server error",
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function handleRequest(req: Request) {
  try {
    const body = await req.json();
    const { action, locationId, query, startDate, endDate, replyText, review_id, url, location, address, placeId } = body || {};

    // ---- Auth: Supabase user (JWT from client)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("No authorization header", 401);
    }
    const supabaseJwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(supabaseJwt);
    if (authError || !user) return jsonError("Unauthorized", 401);

    // ---- Google access token (from client) - only required for certain actions
    const googleAccessToken = req.headers.get("X-Google-Token");
    
    // Actions that require Google access token
    const actionsRequiringGoogleToken = [
      "get_user_locations",
      "fetch_user_locations", 
      "search_locations",
      "fetch_location_analytics",
      "fetch_location_reviews",
      "reply_to_review",
      "fetch_competitor_data"
    ];
    
    if (actionsRequiringGoogleToken.includes(action) && !googleAccessToken) {
      return jsonError(
        "Missing Google access token. Send Supabase session.provider_token in 'X-Google-Token' header.",
        400
      );
    }

    switch (action) {
      case "get_user_locations":
      case "fetch_user_locations":
        return await fetchUserLocations(user.id, googleAccessToken);

      case "search_locations":
        if (!query) return jsonError("Missing 'query' for search_locations", 400);
        return await searchLocations(user.id, query, googleAccessToken);

      case "fetch_reviews":
        if (!locationId) return jsonError("Missing 'locationId' for fetch_reviews", 400);
        return await fetchLocationReviews(locationId, googleAccessToken);
      
      case "sync_reviews_incremental":
        if (!locationId) return jsonError("Missing 'locationId' for sync_reviews_incremental", 400);
        return await syncReviewsIncremental(user.id, locationId, googleAccessToken);

      case "fetch_analytics":
        if (!locationId) return jsonError("Missing 'locationId' for fetch_analytics", 400);
        return await fetchLocationAnalytics(locationId, googleAccessToken, startDate, endDate);

      case "reply_to_review":
        if (!locationId) return jsonError("Missing 'locationId' for reply_to_review", 400);
        if (!review_id) return jsonError("Missing 'review_id' (Google reviewId) for reply_to_review", 400);
        if (!replyText) return jsonError("Missing 'replyText' for reply_to_review", 400);
        return await replyToReview(locationId, review_id, replyText, googleAccessToken, user.id);

      case "search_competitors":
        if (!query) return jsonError("Missing 'query' for search_competitors", 400);
        return await searchCompetitors(query, googleAccessToken);

      case "fetch_competitor_data":
        if (!placeId) return jsonError("Missing 'placeId' for fetch_competitor_data", 400);
        return await fetchCompetitorData(placeId, googleAccessToken);

        case "find_nearby_competitors":
          if (!location) return jsonError("Missing 'location' for find_nearby_competitors", 400);
          return await findNearbyCompetitors(location, address);

        case "extract_competitor_from_url":
          if (!url) return jsonError("Missing 'url' for extract_competitor_from_url", 400);
          return await extractCompetitorFromUrl(url);

      default:
        return jsonError("Invalid action", 400);
    }
  } catch (error) {
    console.error("Error in google-business-api function:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

// ---------- Helpers

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status = 400) {
  return json({ error: message }, status);
}

async function googleApiRequest(
  url: string,
  accessToken: string,
  method = "GET",
  params?: Record<string, string>,
  body?: unknown
) {
  const urlWithParams = params ? `${url}?${new URLSearchParams(params).toString()}` : url;
  const response = await fetch(urlWithParams, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google API Error: ${response.status} - ${errorText}`);
    throw new Error(`Google API request failed: ${response.status}`);
  }
  if (response.status === 204) return {};
  return await response.json();
}

async function getAllAccountIds(accessToken: string) {
  const data = await googleApiRequest(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken
  );
  if (!data.accounts || data.accounts.length === 0) {
    throw new Error("No Google Business accounts found");
  }
  // names like "accounts/1234567890"
  return data.accounts.map((acc: any) => acc.name);
}

/** v4 GET location metadata (for avg rating / total review count). */
async function getV4LocationMetadata(accountId: string, locationId: string, accessToken: string) {
  const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}`;
  const data = await googleApiRequest(url, accessToken, "GET");
  const avg = data?.metadata?.averageRating ?? null;
  const total = data?.metadata?.totalReviewCount ?? null;
  return { averageRating: avg, totalReviewCount: total };
}

async function fetchUserLocations(_userId: string, accessToken: string) {
  try {
    const accountIds = await getAllAccountIds(accessToken);
    const allLocations: any[] = [];

    for (const accountId of accountIds) {
      let nextPageToken: string | null = null;

      do {
        const params: Record<string, string> = {
          readMask:
            "name,title,phoneNumbers,storefrontAddress,languageCode,storeCode,categories,websiteUri,regularHours,specialHours,serviceArea,labels,latlng,openInfo,profile,moreHours,serviceItems",
          pageSize: "100",
        };
        if (nextPageToken) params.pageToken = nextPageToken;

        const data = await googleApiRequest(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
          accessToken,
          "GET",
          params
        );

        const locations = data.locations || [];

        for (const loc of locations) {
          const id = loc.name?.split("/").pop(); // locationId
          let averageRating: number | null = null;
          let totalReviewCount: number | null = null;
          try {
            const meta = await getV4LocationMetadata(accountId, id!, accessToken);
            averageRating = meta.averageRating;
            totalReviewCount = meta.totalReviewCount;
            console.log(`Location ${id} metadata:`, { averageRating, totalReviewCount });
          } catch (e) {
            console.log(`v4 metadata not available for ${accountId}/locations/${id}:`, e.message);
            // Try to get review count from reviews API as fallback
            try {
              const reviewsData = await fetchLocationReviews(id!, accessToken);
              const reviews = await reviewsData.json();
              totalReviewCount = reviews.reviews?.length || 0;
              if (totalReviewCount > 0) {
                // Calculate average rating from reviews
                const totalRating = reviews.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
                averageRating = totalRating / totalReviewCount;
              }
              console.log(`Fallback data for ${id}:`, { averageRating, totalReviewCount });
            } catch (fallbackError) {
              console.log(`Fallback also failed for ${id}:`, fallbackError.message);
            }
          }

          allLocations.push({
            id,
            google_place_id: loc.name, // "accounts/{acc}/locations/{id}"
            name: loc.title || "Unknown Location",
            address: loc.storefrontAddress
              ? `${loc.storefrontAddress.addressLines?.join(", ") || ""}, ${loc.storefrontAddress.locality || ""}, ${loc.storefrontAddress.administrativeArea || ""}`.trim()
              : null,
            phone: loc.phoneNumbers?.primaryPhone || null,
            website: loc.websiteUri || null,
            rating: averageRating,
            total_reviews: totalReviewCount || 0,
            latitude: loc.latlng?.latitude || null,
            longitude: loc.latlng?.longitude || null,
            status: "active",
            last_fetched_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        nextPageToken = data.nextPageToken ?? null;
        console.log(`Fetched ${locations.length} locations from ${accountId}`);
      } while (nextPageToken);
    }

    return json({ locations: allLocations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    throw error;
  }
}

async function searchLocations(userId: string, query: string, accessToken: string) {
  // naive: fetch then filter
  const res = await fetchUserLocations(userId, accessToken);
  const data = await res.json();
  const q = query.toLowerCase();
  const filtered = (data.locations as any[]).filter((l: any) =>
    l.name?.toLowerCase().includes(q) || l.address?.toLowerCase().includes(q)
  );
  return json({ locations: filtered });
}

// ✅ map "ONE..FIVE" -> 1..5
function mapStarRatingToNumber(star: string | undefined): number {
  switch (star) {
    case "ONE": return 1;
    case "TWO": return 2;
    case "THREE": return 3;
    case "FOUR": return 4;
    case "FIVE": return 5;
    default: return 0;
  }
}

async function fetchLocationReviews(locationId: string, accessToken: string) {
  try {
    const accountIds = await getAllAccountIds(accessToken);
    let allReviews: any[] = [];
    const maxReviews = 1000; // Limit to prevent memory issues
    const maxPages = 50; // Prevent infinite loops

    for (const accountId of accountIds) {
      try {
        let nextPageToken: string | null = null;
        let pageCount = 0;
        const seenTokens = new Set<string>(); // Prevent infinite loops
        
        do {
          // Safety checks
          if (pageCount >= maxPages) {
            console.log(`Reached maximum page limit (${maxPages}) for location ${locationId}`);
            break;
          }
          
          if (allReviews.length >= maxReviews) {
            console.log(`Reached maximum review limit (${maxReviews}) for location ${locationId}`);
            break;
          }

          // Check for infinite loop
          if (nextPageToken && seenTokens.has(nextPageToken)) {
            console.log(`Detected infinite loop with token: ${nextPageToken}`);
            break;
          }
          
          if (nextPageToken) {
            seenTokens.add(nextPageToken);
          }

          const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/reviews${
            nextPageToken ? `?pageToken=${nextPageToken}` : ""
          }`;
          
          // Add timeout and rate limiting
          const data = await Promise.race([
            googleApiRequest(url, accessToken),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 30000) // 30 second timeout
            )
          ]) as any;
          
          const raw = data.reviews || [];
          const formatted = raw.map((r: any) => ({
            id: r.reviewId,
            google_review_id: r.reviewId,
            author_name: r.reviewer?.displayName || "Anonymous",
            author_photo_url: r.reviewer?.profilePhotoUrl || null,
            rating: mapStarRatingToNumber(r.starRating),
            text: r.comment || "",
            review_date: r.createTime || new Date().toISOString(),
            reply_text: r.reviewReply?.comment || null,
            reply_date: r.reviewReply?.updateTime || null,
            ai_sentiment: null,
            ai_tags: [],
            location_id: locationId,
          }));
          
          allReviews.push(...formatted);
          nextPageToken = data.nextPageToken ?? null;
          pageCount++;
          
          // Rate limiting - small delay between requests
          if (nextPageToken) {
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
          }
          
        } while (nextPageToken);

        break; // owning account found
      } catch (error) {
        console.log(`Error fetching reviews for location ${locationId} in ${accountId}:`, error);
        // Continue to next account instead of breaking
        continue;
      }
    }

    console.log(`Successfully fetched ${allReviews.length} reviews for location ${locationId}`);
    return json({ reviews: allReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return json({ reviews: [], error: error.message });
  }
}

/** ✅ After replying on Google, also persist reply into saved_reviews so UI updates immediately */
async function replyToReview(
  locationId: string,
  reviewId: string,
  replyText: string,
  accessToken: string,
  userId: string
) {
  const accountIds = await getAllAccountIds(accessToken);
  for (const accountId of accountIds) {
    try {
      const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;
      await googleApiRequest(url, accessToken, "PUT", undefined, { comment: replyText });

      // Persist to DB
      try {
        const now = new Date().toISOString();

        const { data: existing, error: selErr } = await supabase
          .from("saved_reviews")
          .select("id")
          .eq("google_review_id", reviewId)
          .eq("location_id", locationId)
          .maybeSingle();

        if (selErr) console.error("DB select error (saved_reviews):", selErr);

        if (existing) {
          const { error: updErr } = await supabase
            .from("saved_reviews")
            .update({ reply_text: replyText, reply_date: now, updated_at: now })
            .eq("id", existing.id);
          if (updErr) console.error("DB update error (saved_reviews):", updErr);
        } else {
          const { error: insErr } = await supabase.from("saved_reviews").insert([{
            user_id: userId,
            google_review_id: reviewId,
            location_id: locationId,
            author_name: "Unknown",
            rating: 0,
            text: "",
            review_date: now,
            reply_text: replyText,
            reply_date: now,
          }]);
          if (insErr) console.error("DB insert error (saved_reviews):", insErr);
        }
      } catch (dbErr) {
        console.error("Persist reply error:", dbErr);
      }

      return json({ ok: true });
    } catch (e) {
      console.log(`Failed replying under ${accountId} for review ${reviewId}: ${e}`);
    }
  }
  return jsonError("Failed to send reply. Ensure the account owns the location and has permissions.", 400);
}

async function fetchLocationAnalytics(
  locationId: string,
  accessToken: string,
  startDate?: any,
  endDate?: any
) {
  try {
    // Determine date range defaults if none provided
    const today = new Date();
    const defaultEnd = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
    const ago = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultStart = {
      year: ago.getFullYear(),
      month: ago.getMonth() + 1,
      day: ago.getDate(),
    };

    const start = startDate || defaultStart;
    const end = endDate || defaultEnd;

    const metrics = [
      "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
      "BUSINESS_CONVERSATIONS",
      "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
      "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
      "BUSINESS_DIRECTION_REQUESTS",
      "CALL_CLICKS",
      "WEBSITE_CLICKS",
      "BUSINESS_BOOKINGS",
      "BUSINESS_FOOD_ORDERS",
      "BUSINESS_FOOD_MENU_CLICKS",
    ];

    const params: Record<string, string> = {
      dailyMetrics: metrics.join(','),
      'dailyRange.start_date.year': String(start.year),
      'dailyRange.start_date.month': String(start.month),
      'dailyRange.start_date.day': String(start.day),
      'dailyRange.end_date.year': String(end.year),
      'dailyRange.end_date.month': String(end.month),
      'dailyRange.end_date.day': String(end.day),
    };

    const paramsSerializer = (p: Record<string, string>) => {
      const metricsPart = p.dailyMetrics
        .split(',')
        .map((metric) => `dailyMetrics=${encodeURIComponent(metric.trim())}`)
        .join('&');
      const dateParams = Object.entries(p)
        .filter(([key]) => key.startsWith('dailyRange'))
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      return `${metricsPart}&${dateParams}`;
    };

    const baseUrl = `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`;
    const queryString = paramsSerializer(params);
    const urlWithParams = `${baseUrl}?${queryString}`;

    const response = await googleApiRequest(urlWithParams, accessToken, 'GET');

    return json({ analytics: response });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return json({ analytics: {} });
  }
}

/** Search for competitors using Google Places API */
async function searchCompetitors(query: string, accessToken: string) {
  try {
    // Note: This would require Google Places API key
    // For now, return mock data to demonstrate the functionality
    console.log(`Searching for competitors with query: ${query}`);
    
    // Mock competitor search results
    const mockResults = [
      {
        place_id: "ChIJMockCompetitor1",
        name: "Competitor Restaurant A",
        rating: 4.6,
        user_ratings_total: 89,
        formatted_address: "123 Main St, San Francisco, CA 94102",
        formatted_phone_number: "+1 (555) 123-4567",
        website: "https://competitor-a.com",
        business_status: "OPERATIONAL"
      },
      {
        place_id: "ChIJMockCompetitor2", 
        name: "Competitor Restaurant B",
        rating: 4.1,
        user_ratings_total: 203,
        formatted_address: "456 Oak Ave, San Francisco, CA 94110",
        formatted_phone_number: "+1 (555) 987-6543",
        website: "https://competitor-b.com",
        business_status: "OPERATIONAL"
      }
    ];

    return json({ competitors: mockResults });
  } catch (error) {
    console.error('Error searching competitors:', error);
    return json({ competitors: [] });
  }
}

/** Fetch competitor data using Google Places API */
async function fetchCompetitorData(placeId: string, accessToken: string) {
  try {
    console.log(`Fetching competitor data for place ID: ${placeId}`);
    
    // Note: This would require Google Places API key and billing setup
    // For now, return mock data to demonstrate the functionality
    const mockCompetitorData = {
      place_id: placeId,
      name: "Competitor Business",
      rating: 4.3,
      user_ratings_total: 156,
      formatted_address: "789 Business St, San Francisco, CA 94105",
      formatted_phone_number: "+1 (555) 456-7890",
      website: "https://competitor-business.com",
      business_status: "OPERATIONAL",
      reviews: [
        {
          author_name: "John Doe",
          rating: 5,
          text: "Great service and food quality!",
          time: 1640995200,
          relative_time_description: "2 months ago"
        },
        {
          author_name: "Jane Smith", 
          rating: 4,
          text: "Good experience overall, could improve on wait times.",
          time: 1640908800,
          relative_time_description: "2 months ago"
        }
      ]
    };

    return json({ competitor: mockCompetitorData });
  } catch (error) {
    console.error('Error fetching competitor data:', error);
    return json({ competitor: null });
  }
}

/** Find nearby competitors based on location using Google Places API */
async function findNearbyCompetitors(locationName: string, address: string) {
  try {
    console.log(`Finding nearby competitors for location: ${locationName}`);
    
    // Get Google Places API key from environment
    const placesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!placesApiKey) {
      console.log('No Google Places API key found, using mock data');
      // Fallback to mock data if no API key
      const mockNearbyCompetitors = [
        {
          place_id: "ChIJMockCompetitor1",
          name: "Nearby Restaurant A",
          rating: 4.6,
          user_ratings_total: 89,
          formatted_address: "123 Main St, Same City",
          formatted_phone_number: "+1 (555) 123-4567",
          website: "https://competitor-a.com",
          business_status: "OPERATIONAL",
          distance: "0.3 miles",
          category: "restaurant"
        },
        {
          place_id: "ChIJMockCompetitor2", 
          name: "Nearby Restaurant B",
          rating: 4.1,
          user_ratings_total: 203,
          formatted_address: "456 Oak Ave, Same City",
          formatted_phone_number: "+1 (555) 987-6543",
          website: "https://competitor-b.com",
          business_status: "OPERATIONAL",
          distance: "0.5 miles",
          category: "restaurant"
        },
        {
          place_id: "ChIJMockCompetitor3",
          name: "Nearby Restaurant C", 
          rating: 4.3,
          user_ratings_total: 156,
          formatted_address: "789 Business St, Same City",
          formatted_phone_number: "+1 (555) 456-7890",
          website: "https://competitor-c.com",
          business_status: "OPERATIONAL",
          distance: "0.7 miles",
          category: "restaurant"
        }
      ];
      return json({ competitors: mockNearbyCompetitors });
    }

    // Use Google Places API to find nearby businesses
    // First, get the coordinates of the user's location
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${placesApiKey}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData.results || geocodeData.results.length === 0) {
      throw new Error('Could not geocode the address');
    }
    
    const location = geocodeData.results[0].geometry.location;
    const lat = location.lat;
    const lng = location.lng;
    
    // Search for nearby restaurants/businesses
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=restaurant&key=${placesApiKey}`;
    const placesResponse = await fetch(placesUrl);
    const placesData = await placesResponse.json();
    
    if (!placesData.results || placesData.results.length === 0) {
      return json({ competitors: [] });
    }
    
    // Process the results and get detailed information for each place
    const competitors = await Promise.all(
      placesData.results.slice(0, 5).map(async (place: any) => {
        try {
          // Get detailed information for each place
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,business_status,reviews&key=${placesApiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const detailsData = await detailsResponse.json();
          
          if (detailsData.result) {
            const result = detailsData.result;
            return {
              place_id: place.place_id,
              name: result.name,
              rating: result.rating || 0,
              user_ratings_total: result.user_ratings_total || 0,
              formatted_address: result.formatted_address,
              formatted_phone_number: result.formatted_phone_number,
              website: result.website,
              business_status: result.business_status || "OPERATIONAL",
              distance: calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng),
              category: "restaurant"
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching details for place ${place.place_id}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null results
    const validCompetitors = competitors.filter(competitor => competitor !== null);
    
    return json({ competitors: validCompetitors });
  } catch (error) {
    console.error('Error finding nearby competitors:', error);
    return json({ competitors: [] });
  }
}

/** Calculate distance between two coordinates in miles */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 3959; // Radius of the Earth in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return `${distance.toFixed(1)} miles`;
}

/** Extract competitor data from Google Maps/Business Profile URL */
async function extractCompetitorFromUrl(url: string) {
  try {
    console.log(`Extracting competitor data from URL: ${url}`);
    
    // Extract place ID from various Google URLs
    let placeId = '';
    
    // Handle different URL formats
    if (url.includes('place_id=')) {
      placeId = url.split('place_id=')[1].split('&')[0];
    } else if (url.includes('/place/')) {
      // Extract from /place/ChIJ... format
      const match = url.match(/\/place\/([^\/]+)/);
      if (match) {
        placeId = match[1];
      }
    } else if (url.includes('maps.google.com')) {
      // Try to extract from maps URL
      const match = url.match(/@[^\/]+\/data=([^&]+)/);
      if (match) {
        placeId = match[1];
      }
    }
    
    if (!placeId) {
      return jsonError("Could not extract place ID from URL", 400);
    }
    
    // Get Google Places API key
    const placesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!placesApiKey) {
      return jsonError("Google Places API key not configured", 500);
    }
    
    // Fetch detailed information from Google Places API
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,formatted_address,formatted_phone_number,website,business_status,reviews,geometry&key=${placesApiKey}`;
    
    const response = await fetch(detailsUrl);
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.result) {
      return jsonError(`Google Places API error: ${data.status}`, 400);
    }
    
    const result = data.result;
    
    // Extract reviews data
    const reviews = result.reviews ? result.reviews.map((review: any) => ({
      author_name: review.author_name,
      rating: review.rating,
      text: review.text,
      time: review.time,
      relative_time_description: review.relative_time_description
    })) : [];
    
    const competitorData = {
      place_id: placeId,
      name: result.name,
      rating: result.rating || 0,
      user_ratings_total: result.user_ratings_total || 0,
      formatted_address: result.formatted_address,
      formatted_phone_number: result.formatted_phone_number,
      website: result.website,
      business_status: result.business_status || "OPERATIONAL",
      reviews: reviews,
      geometry: result.geometry
    };
    
    return json({ competitor: competitorData });
    
  } catch (error) {
    console.error('Error extracting competitor from URL:', error);
    return jsonError("Failed to extract competitor data from URL", 500);
  }
}

// ============================================
// INCREMENTAL SYNC - ONLY FETCH NEW REVIEWS
// ============================================

async function syncReviewsIncremental(userId: string, locationId: string, accessToken: string) {
  try {
    console.log(`🔄 Starting incremental sync for location: ${locationId}`);
    
    // Update sync status to 'syncing'
    await supabase.rpc('update_sync_status', {
      p_user_id: userId,
      p_location_id: locationId,
      p_status: 'syncing'
    });
    
    // Get last sync date from database
    const { data: syncStatus, error: syncError } = await supabase
      .from('location_sync_status')
      .select('last_synced_at')
      .eq('user_id', userId)
      .eq('location_id', locationId)
      .single();
    
    const lastSyncDate = syncStatus?.last_synced_at || '2020-01-01';
    console.log(`📅 Last synced: ${lastSyncDate}`);
    
    // Get existing review IDs to avoid duplicates
    // Check existing reviews by user (not narrowed to location) because
    // the same Google review_id can appear across multiple locations
    // for the same business/account. The unique constraint is on
    // (user_id, google_review_id), so we must dedupe at the user level.
    const { data: existingReviews } = await supabase
      .from('saved_reviews')
      .select('google_review_id')
      .eq('user_id', userId);
    
    const existingReviewIds = new Set(
      existingReviews?.map(r => r.google_review_id) || []
    );
    
    console.log(`📊 Found ${existingReviewIds.size} existing reviews`);
    
    // Fetch ALL reviews from Google (we'll filter new ones)
    const accountIds = await getAllAccountIds(accessToken);
    let allReviews: any[] = [];
    const maxReviews = 1000; // Limit to prevent memory issues
    
    for (const accountId of accountIds) {
      try {
        let nextPageToken: string | null = null;
        let pageCount = 0;
        const maxPages = 50;
        
        do {
          if (pageCount >= maxPages || allReviews.length >= maxReviews) {
            break;
          }
          
          const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/reviews${
            nextPageToken ? `?pageToken=${nextPageToken}` : ""
          }`;
          
          const data = await googleApiRequest(url, accessToken) as any;
          const raw = data.reviews || [];
          
          const formatted = raw.map((r: any) => ({
            id: r.reviewId,
            google_review_id: r.reviewId,
            author_name: r.reviewer?.displayName || "Anonymous",
            rating: mapStarRatingToNumber(r.starRating),
            text: r.comment || "",
            review_date: r.createTime || r.updateTime,
            reply_text: r.reviewReply?.comment || null,
            reply_date: r.reviewReply?.updateTime || null,
          }));
          
          allReviews.push(...formatted);
          nextPageToken = data.nextPageToken ?? null;
          pageCount++;
          
        } while (nextPageToken);
        
      } catch (error) {
        console.error(`Error fetching reviews from account ${accountId}:`, error);
      }
    }
    
    // Filter only NEW reviews (not in database)
    const newReviews = allReviews.filter(
      review => !existingReviewIds.has(review.google_review_id)
    );
    
    console.log(`✨ Found ${newReviews.length} NEW reviews out of ${allReviews.length} total`);
    
    // Save only new reviews to database
    if (newReviews.length > 0) {
      // De-duplicate by google_review_id in case Google returned duplicates
      const seen = new Set<string>()
      const deduped = newReviews.filter(r => {
        if (seen.has(r.google_review_id)) return false
        seen.add(r.google_review_id)
        return true
      })

      const reviewsToInsert = deduped.map(review => ({
        user_id: userId,
        location_id: locationId,
        google_review_id: review.google_review_id,
        author_name: review.author_name,
        rating: review.rating,
        text: review.text,
        review_date: review.review_date,
        reply_text: review.reply_text,
        reply_date: review.reply_date,
      }));
      
      // Use upsert keyed to the unique constraint (user_id, google_review_id)
      const { error: insertError } = await supabase
        .from('saved_reviews')
        .upsert(reviewsToInsert, { onConflict: 'user_id,google_review_id' });
      
      if (insertError) {
        console.error('Error saving new reviews:', insertError);
        throw insertError;
      }
    }
    
    // Update sync status to 'success'
    await supabase.rpc('update_sync_status', {
      p_user_id: userId,
      p_location_id: locationId,
      p_status: 'success',
      p_new_reviews_count: newReviews.length
    });
    
    return json({
      success: true,
      total_reviews: allReviews.length,
      new_reviews: newReviews.length,
      existing_reviews: existingReviewIds.size,
      last_synced: new Date().toISOString(),
      message: `Synced ${newReviews.length} new reviews`,
    });
    
  } catch (error) {
    console.error('Incremental sync error:', error);
    
    // Update sync status to 'failed'
    await supabase.rpc('update_sync_status', {
      p_user_id: userId,
      p_location_id: locationId,
      p_status: 'failed',
      p_error_message: error.message
    });
    
    return jsonError(`Sync failed: ${error.message}`, 500);
  }
}
