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
import { Search, Star, Filter, RefreshCw, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "@/contexts/LocationContext";
import ReplyDialog from "@/components/ReplyDialog";

interface Review {
  id: string;
  google_review_id: string;
  author_name: string;
  rating: number;
  text: string | null;
  review_date: string;
  reply_text: string | null;
  reply_date: string | null;
  ai_sentiment: "positive" | "negative" | "neutral" | null;
  ai_tags: string[] | null;
}

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = useLocation(); // expected to carry at least { id, google_place_id?, name? }
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  useEffect(() => {
    if (user && selectedLocation) fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedLocation]);

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

  const resolveLocationId = (): string | null => {
    if (!selectedLocation) return null;
    // Prefer canonical ID if present; otherwise parse from google_place_id
    // @ts-ignore allow different possible shapes from context
    const directId = selectedLocation.id || selectedLocation.location_id;
    if (directId) return String(directId);
    // @ts-ignore
    const gp = selectedLocation.google_place_id as string | undefined;
    if (gp) {
      const tail = gp.split("/").pop();
      return tail || gp;
    }
    return null;
  };

  const fetchReviews = async () => {
    const locId = resolveLocationId();
    if (!locId) {
      setReviews([]);
      setLoading(false);
      console.warn("No locationId available to fetch reviews");
      return;
    }

    setLoading(true);
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: { action: "fetch_reviews", locationId: locId },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) {
        console.error("fetch_reviews error:", error);
        throw error;
      }

      const reviewsData: Review[] = data?.reviews || [];
      setReviews(reviewsData);

      // (Optional) Kick off AI analysis without blocking UI
      // If your ai-review-analysis only supports single-review calls, skip this.
      // try {
      //   await supabase.functions.invoke("ai-review-analysis", {
      //     body: { reviews: reviewsData },
      //     headers: { "Content-Type": "application/json" },
      //   });
      // } catch (e) {
      //   console.log("AI analysis failed (non-blocking):", e);
      // }
    } catch (error: any) {
      console.error("Error fetching reviews:", error?.message || error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch reviews",
        variant: "destructive",
      });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const allTags = Array.from(new Set(reviews.flatMap((r) => r.ai_tags || [])));

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchTerm ||
      review.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.author_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSentiment =
      sentimentFilter === "all" || review.ai_sentiment === sentimentFilter;

    const matchesRating =
      ratingFilter === "all" || String(review.rating) === ratingFilter;

    const matchesTag =
      tagFilter === "all" || (review.ai_tags && review.ai_tags.includes(tagFilter));

    return matchesSearch && matchesSentiment && matchesRating && matchesTag;
  });

  if (!user && !authLoading) return <Navigate to="/" replace />;

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
            <div className="flex items-center space-x-4 ml-4">
              <h1 className="text-xl font-semibold">Reviews</h1>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              <Button onClick={fetchReviews} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Reviews</p>
                      <p className="text-2xl font-bold">{reviews.length}</p>
                    </div>
                    <MessageSquare className="h-8 w-8" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Rating</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold">
                          {reviews.length
                            ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
                            : "0.0"}
                        </p>
                        <Star className="h-5 w-5 fill-current" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tagged</p>
                      <p className="text-2xl font-bold">{allTags.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Sentiments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiments</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Ratings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      <SelectItem value="1">1 Star</SelectItem>
                      <SelectItem value="2">2 Stars</SelectItem>
                      <SelectItem value="3">3 Stars</SelectItem>
                      <SelectItem value="4">4 Stars</SelectItem>
                      <SelectItem value="5">5 Stars</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={tagFilter} onValueChange={setTagFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Tags" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tags</SelectItem>
                      {allTags.map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <div className="space-y-4">
              {filteredReviews.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                    <p className="text-muted-foreground">
                      {reviews.length === 0
                        ? "No reviews available for this location."
                        : "No reviews match your current filters."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredReviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold">{review.author_name}</h3>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.review_date), "MMM dd, yyyy")}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < (review.rating || 0) ? "fill-current" : "text-muted-foreground"}`}
                              />
                            ))}
                          </div>

                          {review.text && <p className="mb-3 leading-relaxed">"{review.text}"</p>}

                          {review.ai_tags && review.ai_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {review.ai_tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {review.reply_text && (
                            <div className="mt-4 p-3 bg-muted/30 border-l-2 rounded-r">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">Business Reply</span>
                                {review.reply_date && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(review.reply_date), "MMM dd, yyyy")}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm">{review.reply_text}</p>
                            </div>
                          )}
                        </div>

                        <div className="ml-4">
                          <ReplyDialog review={review} onReplySubmitted={fetchReviews} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;
