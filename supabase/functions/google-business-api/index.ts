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
// (Optional) Keep for future server-side OAuth flows
const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Parse body
    const { action, locationId, query, startDate, endDate } = await req.json();

    // ---- Auth: Supabase user (JWT from client)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("No authorization header", 401);
    }

    const supabaseJwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(supabaseJwt);
    if (authError || !user) {
      return jsonError("Unauthorized", 401);
    }

    // ---- Google access token (MUST be sent by client)
    const googleAccessToken = req.headers.get("X-Google-Token");
    if (!googleAccessToken) {
      return jsonError(
        "Missing Google access token. On the client, send session.provider_token in 'X-Google-Token' header.",
        400,
      );
    }

    // ---- Route actions
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

      case "fetch_analytics":
        if (!locationId) return jsonError("Missing 'locationId' for fetch_analytics", 400);
        return await fetchLocationAnalytics(locationId, googleAccessToken, startDate, endDate);

      default:
        return jsonError("Invalid action", 400);
    }
  } catch (error) {
    console.error("Error in google-business-api function:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

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

async function googleApiRequest(url: string, accessToken: string, method = "GET", params?: Record<string, string>) {
  const urlWithParams = params ? `${url}?${new URLSearchParams(params).toString()}` : url;

  const response = await fetch(urlWithParams, {
    method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
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
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    accessToken,
  );

  if (!data.accounts || data.accounts.length === 0) {
    throw new Error("No Google Business accounts found");
  }

  // API returns names like "accounts/1234567890"
  return data.accounts.map((acc: any) => acc.name);
}

async function fetchUserLocations(userId: string, accessToken: string) {
  try {
    const accountIds = await getAllAccountIds(accessToken);
    console.log("Found Google Business accounts:", accountIds);

    const allLocations: any[] = [];

    // Each account: list locations
    for (const accountId of accountIds) {
      let nextPageToken: string | null = null;

      do {
        const params: Record<string, string> = {
          readMask:
            "name,title,phoneNumbers,storefrontAddress,languageCode,storeCode,categories,websiteUri,regularHours,specialHours,serviceArea,labels,latlng,openInfo,metadata,profile,moreHours,serviceItems",
          pageSize: "100",
        };

        if (nextPageToken) params.pageToken = nextPageToken;

        const data = await googleApiRequest(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations`,
          accessToken,
          "GET",
          params,
        );

        const locations = data.locations || [];

        const formatted = locations.map((loc: any) => ({
          id: loc.name?.split("/").pop(),
          google_place_id: loc.name,
          name: loc.title || "Unknown Location",
          address: loc.storefrontAddress
            ? `${loc.storefrontAddress.addressLines?.join(", ") || ""}, ${loc.storefrontAddress.locality || ""}, ${loc.storefrontAddress.administrativeArea || ""}`.trim()
            : null,
          phone: loc.phoneNumbers?.primaryPhone || null,
          website: loc.websiteUri || null,
          rating: loc.metadata?.averageRating || null,
          total_reviews: loc.metadata?.newReviewCount || 0,
          latitude: loc.latlng?.latitude || null,
          longitude: loc.latlng?.longitude || null,
          status: "active",
          last_fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        allLocations.push(...formatted);
        nextPageToken = data.nextPageToken ?? null;

        console.log(`Fetched ${formatted.length} locations from ${accountId}`);
      } while (nextPageToken);
    }

    return json({ locations: allLocations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    throw error;
  }
}

async function searchLocations(userId: string, query: string, accessToken: string) {
  const response = await fetchUserLocations(userId, accessToken);
  const data = await response.json();

  const q = query.toLowerCase();
  const filtered = (data.locations as any[]).filter((location: any) =>
    location.name?.toLowerCase().includes(q) ||
    location.address?.toLowerCase().includes(q)
  );

  return json({ locations: filtered });
}

async function fetchLocationReviews(locationId: string, accessToken: string) {
  try {
    const accountIds = await getAllAccountIds(accessToken);
    let allReviews: any[] = [];

    for (const accountId of accountIds) {
      try {
        let nextPageToken: string | null = null;
        do {
          const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/reviews${
            nextPageToken ? `?pageToken=${nextPageToken}` : ""
          }`;

          const data = await googleApiRequest(url, accessToken);

          const raw = data.reviews || [];
          const formatted = raw.map((r: any) => ({
            id: r.reviewId,
            author_name: r.reviewer?.displayName || "Anonymous",
            rating: r.starRating || 0,
            text: r.comment || "",
            review_date: r.createTime || new Date().toISOString(),
            ai_sentiment: null,
            ai_tags: [],
          }));

          allReviews.push(...formatted);
          nextPageToken = data.nextPageToken ?? null;
        } while (nextPageToken);

        break; // found it for this account
      } catch (_e) {
        console.log(`No reviews for location ${locationId} in ${accountId}`);
        continue;
      }
    }

    return json({ reviews: allReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    // Return empty reviews on error (non-fatal)
    return json({ reviews: [] });
  }
}

async function fetchLocationAnalytics(locationId: string, accessToken: string, startDate?: any, endDate?: any) {
  try {
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

    const params: Record<string, string> = {
      dailyMetrics: [
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
      ].join(","),
      "dailyRange.start_date.year": String(start.year),
      "dailyRange.start_date.month": String(start.month),
      "dailyRange.start_date.day": String(start.day),
      "dailyRange.end_date.year": String(end.year),
      "dailyRange.end_date.month": String(end.month),
      "dailyRange.end_date.day": String(end.day),
    };

    const url = `https://businessprofileperformance.googleapis.com/v1/locations/${locationId}:fetchMultiDailyMetricsTimeSeries`;
    const response = await googleApiRequest(url, accessToken, "GET", params);

    return json({ analytics: response });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return json({ analytics: {} });
  }
}
