// /supabase/functions/google-business-api/index.ts

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-google-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// scopes needed: https://www.googleapis.com/auth/business.manage
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, locationId, query, startDate, endDate, replyText, review_id } = body || {};

    // ---- Auth: Supabase user (JWT from client)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonError("No authorization header", 401);
    }
    const supabaseJwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(supabaseJwt);
    if (authError || !user) return jsonError("Unauthorized", 401);
    const userId = user.id;

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
        return await fetchUserLocations(userId, googleAccessToken);

      case "search_locations":
        if (!query) return jsonError("Missing 'query' for search_locations", 400);
        return await searchLocations(userId, query, googleAccessToken);

      case "fetch_reviews":
        if (!locationId) return jsonError("Missing 'locationId' for fetch_reviews", 400);
        return await fetchLocationReviews(userId, locationId, googleAccessToken); // persists to DB

      case "fetch_analytics":
        if (!locationId) return jsonError("Missing 'locationId' for fetch_analytics", 400);
        return await fetchLocationAnalytics(locationId, googleAccessToken, startDate, endDate);

      case "reply_to_review":
        if (!locationId) return jsonError("Missing 'locationId' for reply_to_review", 400);
        if (!review_id) return jsonError("Missing 'review_id' (Google reviewId) for reply_to_review", 400);
        if (!replyText) return jsonError("Missing 'replyText' for reply_to_review", 400);
        return await replyToReview(userId, locationId, review_id, replyText, googleAccessToken); // persists to DB

      default:
        return jsonError("Invalid action", 400);
    }
  } catch (error) {
    console.error("Error in google-business-api function:", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Internal error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

// ---------- Helpers

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
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
          } catch (_e) {
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

// Persist one review row into DB (update if exists, else insert), using your schema incl. user_id
async function persistReviewRow(userId: string, r: {
  google_review_id: string;
  location_id: string;
  author_name: string;
  rating: number;
  text: string;
  review_date: string | null;
  reply_text: string | null;
  reply_date: string | null;
}) {
  try {
    const { data: existing, error: selErr } = await supabase
      .from("reviews")
      .select("id")
      .eq("google_review_id", r.google_review_id)
      .eq("location_id", r.location_id)
      .maybeSingle();

    if (selErr) {
      console.error("DB select error (reviews):", selErr);
      return;
    }

    if (existing) {
      const { error: updErr } = await supabase
        .from("reviews")
        .update({
          author_name: r.author_name,
          rating: r.rating,
          text: r.text,
          review_date: r.review_date,
          reply_text: r.reply_text,
          reply_date: r.reply_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updErr) console.error("DB update error (reviews):", updErr);
    } else {
      const { error: insErr } = await supabase
        .from("reviews")
        .insert([{
          user_id: userId,
          google_review_id: r.google_review_id,
          location_id: r.location_id,
          author_name: r.author_name,
          rating: r.rating,
          text: r.text,
          review_date: r.review_date,
          reply_text: r.reply_text,
          reply_date: r.reply_date,
          ai_sentiment: null,
          ai_tags: [],
          ai_analyzed_at: null,
          ai_issues: null,
          ai_suggestions: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);
      if (insErr) console.error("DB insert error (reviews):", insErr);
    }
  } catch (e) {
    console.error("persistReviewRow error:", e);
  }
}

async function fetchLocationReviews(userId: string, locationId: string, accessToken: string) {
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

          // Persist to DB (so manual Google replies are saved locally)
          for (const r of formatted) {
            await persistReviewRow(userId, {
              google_review_id: r.google_review_id,
              location_id: r.location_id,
              author_name: r.author_name,
              rating: r.rating,
              text: r.text,
              review_date: r.review_date,
              reply_text: r.reply_text,
              reply_date: r.reply_date,
            });
          }

          nextPageToken = data.nextPageToken ?? null;
        } while (nextPageToken);

        break; // owning account found
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

async function replyToReview(userId: string, locationId: string, reviewId: string, replyText: string, accessToken: string) {
  const accountIds = await getAllAccountIds(accessToken);
  for (const accountId of accountIds) {
    try {
      const url = `https://mybusiness.googleapis.com/v4/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;
      await googleApiRequest(url, accessToken, "PUT", undefined, { comment: replyText });

      // Persist reply immediately so UI reflects the change
      const replyUpdateTime = new Date().toISOString();

      const { data: existing, error: selErr } = await supabase
        .from("reviews")
        .select("id")
        .eq("google_review_id", reviewId)
        .eq("location_id", locationId)
        .maybeSingle();

      if (selErr) {
        console.error("DB select error (reply persist):", selErr);
      } else if (existing) {
        const { error: updErr } = await supabase
          .from("reviews")
          .update({
            reply_text: replyText,
            reply_date: replyUpdateTime,
            updated_at: replyUpdateTime,
          })
          .eq("id", existing.id);
        if (updErr) console.error("DB update error (reply persist):", updErr);
      } else {
        const { error: insErr } = await supabase
          .from("reviews")
          .insert([{
            user_id: userId,
            google_review_id: reviewId,
            location_id: locationId,
            author_name: "", // unknown if not fetched yet
            rating: 0,
            text: "",
            review_date: null,
            reply_text: replyText,
            reply_date: replyUpdateTime,
            ai_sentiment: null,
            ai_tags: [],
            ai_analyzed_at: null,
            ai_issues: null,
            ai_suggestions: null,
            created_at: replyUpdateTime,
            updated_at: replyUpdateTime,
          }]);
        if (insErr) console.error("DB insert error (reply persist):", insErr);
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
