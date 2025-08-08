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
// NOTE: we only need client-provided Google user access token; no server OAuth here.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, locationId, query, startDate, endDate, replyText, review_id } = body || {};

    // ---- Auth: Supabase user (JWT from client)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("No authorization header", 401);
    }
    const supabaseJwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(supabaseJwt);
    if (authError || !user) return jsonError("Unauthorized", 401);

    // ---- Google access token (from client)
    const googleAccessToken = req.headers.get("X-Google-Token");
    if (!googleAccessToken) {
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

      case "fetch_analytics":
        if (!locationId) return jsonError("Missing 'locationId' for fetch_analytics", 400);
        return await fetchLocationAnalytics(locationId, googleAccessToken, startDate, endDate);

      case "reply_to_review":
        if (!locationId) return jsonError("Missing 'locationId' for reply_to_review", 400);
        if (!review_id) return jsonError("Missing 'review_id' (Google reviewId) for reply_to_review", 400);
        if (!replyText) return jsonError("Missing 'replyText' for reply_to_review", 400);
        return await replyToReview(locationId, review_id, replyText, googleAccessToken);

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
  if (response.status === 204) return {}; // no content
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

/**
 * v4 GET location metadata (for avg rating / total review count).
 * @param accountId like "accounts/123"
 * @param locationId like "12345678901234567890" (the trailing id in BI API name)
 */
async function getV4LocationMetadata(accountId: string, locationId: string, accessToken: string) {
  const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}`;
  // response includes "metadata": { averageRating, totalReviewCount, ... } for verified listings
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
            "name,title,phoneNumbers,storefrontAddress,languageCode,storeCode,categories,websiteUri,regularHours,specialHours,serviceArea,labels,latlng,openInfo,profile,moreHours,serviceItems", // removed 'metadata' (BI API not reliable for rating)
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

        // Enrich each with v4 metadata (averageRating, totalReviewCount).
        for (const loc of locations) {
          const id = loc.name?.split("/").pop(); // locationId
          let averageRating: number | null = null;
          let totalReviewCount: number | null = null;
          try {
            const meta = await getV4LocationMetadata(accountId, id, accessToken);
            averageRating = meta.averageRating;
            totalReviewCount = meta.totalReviewCount;
          } catch (e) {
            console.log(`v4 metadata not available for ${accountId}/locations/${id}`);
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
            rating: averageRating,                 // ✅ filled from v4
            total_reviews: totalReviewCount || 0,  // ✅ filled from v4
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
            google_review_id: r.reviewId,
            author_name: r.reviewer?.displayName || "Anonymous",
            author_photo_url: r.reviewer?.profilePhotoUrl || null,
            rating: r.starRating || 0,
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
        } while (nextPageToken);

        // if succeeded for this account, break (location belongs to this account)
        break;
      } catch (_e) {
        console.log(`No reviews for location ${locationId} in ${accountId}`);
        continue;
      }
    }

    return json({ reviews: allReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return json({ reviews: [] });
  }
}

async function replyToReview(locationId: string, reviewId: string, replyText: string, accessToken: string) {
  // Try across accounts until one succeeds (the owning account)
  const accountIds = await getAllAccountIds(accessToken);
  for (const accountId of accountIds) {
    try {
      const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;
      await googleApiRequest(url, accessToken, "PUT", undefined, { comment: replyText });
      return json({ ok: true });
    } catch (e) {
      console.log(`Failed replying under ${accountId} for review ${reviewId}: ${e}`);
      // try next
    }
  }
  return jsonError("Failed to send reply. Ensure the account owns the location and has permissions.", 400);
}

async function fetchLocationAnalytics(locationId: string, accessToken: string, startDate?: any, endDate?: any) {
  try {
    const today = new Date();
    const defaultEnd = { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
    const ago = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const defaultStart = { year: ago.getFullYear(), month: ago.getMonth() + 1, day: ago.getDate() };

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
