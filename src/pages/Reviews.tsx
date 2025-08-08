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
import { MessageSquare, Star, Filter, Search, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "@/contexts/LocationContext";
import ReplyDialog from "@/components/ReplyDialog";

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
  const { selectedLocation: globalSelectedLocation } = useLocation();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");

  // --- helper to ensure we always have tokens
  const getSessionTokens = async () => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      await supabase.auth.refreshSession();
      ({ data: { session } } = await supabase.auth.getSession());
    }
    return {
      supabaseJwt: session?.access_token || "",
      googleAccessToken: session?.provider_token || "",
    };
  };

  useEffect(() => {
    if (!user || !globalSelectedLocation) return;
    (async () => {
      await fetchReviews();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, globalSelectedLocation]);


  const fetchReviews = async () => {
    try {
      setLoading(true);

      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        setReviews([]);
        return;
      }

      // Use global selected location
      if (!globalSelectedLocation) {
        setReviews([]);
        return;
      }

      const locationId = globalSelectedLocation.google_place_id.split('/').pop();
      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: { action: "fetch_reviews", locationId },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) {
        console.error("fetch_reviews error:", error);
        setReviews([]);
        return;
      }

      setReviews(data?.reviews || []);
    } catch (e) {
      console.error("Error fetching reviews:", e);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefetchReviews = async (locationId?: string) => {
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        throw new Error("Missing tokens");
      }

      const idToUse = locationId || (globalSelectedLocation?.google_place_id.split('/').pop());
      if (!idToUse) {
        toast({ title: "Select a location", description: "Choose a location to refresh reviews." });
        return;
      }

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

  const handleReplyToReview = async (googleReviewId: string, replyText: string) => {
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      // NOTE: Your backend does NOT implement 'reply_to_review' yet.
      const { error } = await supabase.functions.invoke("google-business-api", {
        body: {
          action: "reply_to_review",
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
              <div className="text-sm text-muted-foreground">
                {globalSelectedLocation ? (
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    Showing reviews for: <strong>{globalSelectedLocation.location_name}</strong>
                  </span>
                ) : (
                  "Select a location to view reviews"
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Customer Reviews
                </h1>
                <p className="text-muted-foreground">
                  Manage and analyze your Google Business reviews with AI insights
                </p>
              </div>
              <Button
                onClick={() => handleRefetchReviews()}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Refresh Reviews
              </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6 border-accent/20 shadow-md backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-foreground">
                  <Filter className="w-5 h-5 mr-2 text-accent" />
                  Smart Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Search Reviews</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-accent w-4 h-4" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-accent/20 focus:border-accent bg-background/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">AI Sentiment</label>
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                      <SelectTrigger className="border-accent/20 focus:border-accent bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiments</SelectItem>
                        <SelectItem value="positive">😊 Positive</SelectItem>
                        <SelectItem value="negative">😞 Negative</SelectItem>
                        <SelectItem value="neutral">😐 Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block text-foreground">Star Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger className="border-accent/20 focus:border-accent bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
                        <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
                        <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
                        <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
                        <SelectItem value="1">⭐ 1 Star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            {filteredReviews.length === 0 ? (
              <Card className="border-accent/20 shadow-md">
                <CardContent className="text-center py-12">
                  <div className="relative">
                    <MessageSquare className="w-16 h-16 text-accent mx-auto mb-4 opacity-80" />
                    <Sparkles className="w-6 h-6 text-accent absolute top-0 right-1/2 transform translate-x-8 animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">No reviews found</h3>
                  <p className="text-muted-foreground mb-6">
                    {reviews.length === 0
                      ? "Fetch reviews from your Google Business locations to get started."
                      : "No reviews match your current filters."}
                  </p>
                  {reviews.length === 0 && (
                    <Button 
                      onClick={() => handleRefetchReviews()}
                      className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Fetch Reviews
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredReviews.map((review) => (
                  <Card key={review.id} className="border-accent/10 shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm bg-card/80">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-4">
                          {review.author_photo_url ? (
                            <img
                              src={review.author_photo_url}
                              alt={review.author_name}
                              className="w-12 h-12 rounded-full ring-2 ring-accent/20"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                              {review.author_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold text-foreground text-lg">{review.author_name}</h4>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {format(new Date(review.review_date), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 transition-colors ${
                                  i < (review.rating || 0)
                                    ? "text-accent fill-current"
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
                              className="font-medium"
                            >
                              {review.ai_sentiment === "positive" && "😊"}
                              {review.ai_sentiment === "negative" && "😞"}
                              {review.ai_sentiment === "neutral" && "😐"}
                              {" " + review.ai_sentiment}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {review.text && (
                        <div className="bg-muted/30 p-4 rounded-lg mb-4 border border-accent/10">
                          <p className="text-foreground leading-relaxed italic">"{review.text}"</p>
                        </div>
                      )}

                      {review.ai_tags && review.ai_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {review.ai_tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="border-accent/30 text-accent hover:bg-accent/10">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {review.reply_text && (
                        <div className="bg-gradient-to-r from-accent/5 to-primary/5 p-4 rounded-lg mb-4 border border-accent/20">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                              <span className="text-white text-xs font-bold">B</span>
                            </div>
                            <p className="text-sm font-medium text-foreground">Business Reply</p>
                          </div>
                          <p className="text-sm text-foreground/90 leading-relaxed">{review.reply_text}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {review.reply_date &&
                              format(new Date(review.reply_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      )}

                      {!review.reply_text && (
                        <div className="pt-4 border-t border-accent/10">
                          <ReplyDialog
                            review={review}
                            onReplySubmitted={() => fetchReviews()}
                          />
                        </div>
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
