// src/pages/Reviews.tsx (or wherever your route/component lives)

import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MessageSquare, Star, Filter, Reply, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Review {
  id: string;
  google_review_id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  text: string | null;
  reply_text: string | null;
  review_date: string;
  reply_date: string | null;
  ai_sentiment: "positive" | "negative" | "neutral" | null;
  ai_tags: string[] | null;
  location_id: string;
  location_name?: string;
}

interface Location {
  id: string;
  name: string;
  google_place_id: string;
}

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  // ---- helper: get Supabase JWT + Google token
  const getSessionTokens = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      supabaseJwt: session?.access_token || "",
      googleAccessToken: session?.provider_token || "",
    };
  };

  useEffect(() => {
    if (user) {
      (async () => {
        await fetchLocations();
        await fetchReviews();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ---- fetch locations (requires headers)
  const fetchLocations = async () => {
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        console.error("Missing tokens for fetchLocations");
        setLocations([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: { action: "fetch_user_locations" },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (!error && data?.locations) {
        setLocations(data.locations);
      } else {
        console.error("fetch_user_locations error:", error || data);
        setLocations([]);
      }
    } catch (e) {
      console.error("Error fetching locations:", e);
      setLocations([]);
    }
  };

  // ---- fetch reviews (single location only; "all" is no-op unless you aggregate client-side)
  const fetchReviews = async () => {
    try {
      setLoading(true);

      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        console.error("Missing tokens for fetchReviews");
        setReviews([]);
        return;
      }

      // backend expects action='fetch_reviews' and param 'locationId'
      if (selectedLocation === "all") {
        // If you want all locations, either:
        // 1) loop over locations here and merge results, or
        // 2) add a 'fetch_all_reviews' action on the server.
        setReviews([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: { action: "fetch_reviews", locationId: selectedLocation },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (!error && data?.reviews) {
        setReviews(data.reviews);
      } else {
        console.error("fetch_reviews error:", error || data);
        setReviews([]);
      }
    } catch (e) {
      console.error("Error fetching reviews:", e);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  // ---- manual refresh; same headers + params
  const handleRefetchReviews = async (locationId?: string) => {
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const idToUse =
        locationId || (selectedLocation !== "all" ? selectedLocation : undefined);
      if (!idToUse) throw new Error("Select a location first");

      const { error } = await supabase.functions.invoke("google-business-api", {
        body: { action: "fetch_reviews", locationId: idToUse },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) throw error;

      toast({ title: "Success", description: "Reviews refreshed successfully" });
      await fetchReviews();
    } catch (error) {
      console.error("Error refreshing reviews:", error);
      toast({
        title: "Error",
        description: "Failed to refresh reviews",
        variant: "destructive",
      });
    }
  };

  // ---- reply to review (NOTE: your backend currently does NOT implement 'reply_to_review')
  const handleReplyToReview = async (googleReviewId: string, replyText: string) => {
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const { error } = await supabase.functions.invoke("google-business-api", {
        body: {
          action: "reply_to_review", // you'll need to add this action server-side if you want it to work
          review_id: googleReviewId,
          reply_text: replyText,
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) throw error;

      toast({ title: "Success", description: "Reply sent successfully" });
      await fetchReviews();
    } catch (error) {
      console.error("Error replying to review:", error);
      toast({
        title: "Error",
        description: "Failed to send reply (server action not implemented)",
        variant: "destructive",
      });
    }
  };

  // ---- filtering
  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchTerm ||
      review.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.author_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSentiment =
      sentimentFilter === "all" || review.ai_sentiment === sentimentFilter;

    const matchesRating =
      ratingFilter === "all" || String(review.rating) === ratingFilter;

    return matchesSearch && matchesSentiment && matchesRating;
  });

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">Reviews</h1>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              <Select
                value={selectedLocation}
                onValueChange={async (value) => {
                  setSelectedLocation(value);
                  await fetchReviews();
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Customer Reviews</h1>
                <p className="text-muted-foreground">
                  Manage and analyze your Google Business reviews with AI insights
                </p>
              </div>
              <Button
                onClick={() =>
                  handleRefetchReviews(
                    selectedLocation !== "all" ? selectedLocation : undefined
                  )
                }
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Refresh Reviews
              </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Sentiment</label>
                    <Select
                      value={sentimentFilter}
                      onValueChange={setSentimentFilter}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiments</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
                  <p className="text-muted-foreground mb-6">
                    {reviews.length === 0
                      ? "Fetch reviews from your Google Business locations to get started."
                      : "No reviews match your current filters."}
                  </p>
                  {reviews.length === 0 && (
                    <Button onClick={() => handleRefetchReviews()}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Fetch Reviews
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          {review.author_photo_url && (
                            <img
                              src={review.author_photo_url}
                              alt={review.author_name}
                              className="w-10 h-10 rounded-full"
                            />
                          )}
                          <div>
                            <h4 className="font-semibold">{review.author_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {review.location_name} •{" "}
                              {format(new Date(review.review_date), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "text-yellow-400 fill-current"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          {review.ai_sentiment && (
                            <Badge
                              variant={
                                review.ai_sentiment === "positive"
                                  ? "default"
                                  : review.ai_sentiment === "negative"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {review.ai_sentiment}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {review.text && (
                        <p className="text-muted-foreground mb-4">{review.text}</p>
                      )}

                      {review.ai_tags && review.ai_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {review.ai_tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {review.reply_text && (
                        <div className="bg-muted p-4 rounded-lg mb-4">
                          <p className="text-sm font-medium mb-1">Business Reply:</p>
                          <p className="text-sm">{review.reply_text}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {review.reply_date &&
                              format(new Date(review.reply_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      )}

                      {!review.reply_text && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const replyText = prompt("Enter your reply:");
                            if (replyText) {
                              // NOTE: server action not implemented yet
                              handleReplyToReview(review.google_review_id, replyText);
                            }
                          }}
                        >
                          <Reply className="w-4 h-4 mr-2" />
                          Reply
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;
