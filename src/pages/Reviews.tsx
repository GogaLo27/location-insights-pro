import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  location_id: string;
}

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = useLocation();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  useEffect(() => {
    if (user && selectedLocation) {
      fetchReviews();
    }
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

  // ✅ robustly resolve the ID Google v4 expects
  const resolveLocationId = () => {
    if (!selectedLocation) return null as string | null;
    // prefer canonical id if present
    // @ts-ignore different shapes depending on where it came from
    const directId = selectedLocation.id || selectedLocation.location_id;
    if (directId) return String(directId);
    // fallback to parsing the BI resource name
    // @ts-ignore
    const gp: string | undefined = selectedLocation.google_place_id;
    if (!gp) return null;
    const tail = gp.split("/").pop();
    return tail || gp;
  };

  const fetchReviews = async () => {
    const locationId = resolveLocationId();
    if (!locationId) return;

    setLoading(true);
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: {
          action: "fetch_reviews",
          locationId,
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) throw error;

      let reviewsData = (data?.reviews || []).map((review: any) => ({
        ...review,
        location_id: locationId
      })) as Review[];

      // Analyze reviews with AI if they don't have sentiment/tags
      const reviewsToAnalyze = reviewsData.filter(review => !review.ai_sentiment || !review.ai_tags);
      
      if (reviewsToAnalyze.length > 0) {
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-review-analysis', {
            body: { reviews: reviewsToAnalyze },
            headers: {
              Authorization: `Bearer ${supabaseJwt}`,
            },
          });

          if (!analysisError && analysisData?.reviews) {
            // Update the reviews with AI analysis
            reviewsData = reviewsData.map(review => {
              const analyzed = analysisData.reviews.find((r: any) => r.google_review_id === review.google_review_id);
              return analyzed ? { ...review, ai_sentiment: analyzed.ai_sentiment, ai_tags: analyzed.ai_tags } : review;
            });
          }
        } catch (analysisError) {
          console.error('Error analyzing reviews:', analysisError);
        }
      }

      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive",
      });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "text-success border-success";
      case "negative": return "text-destructive border-destructive";
      case "neutral": return "text-muted-foreground border-muted-foreground";
      default: return "text-muted-foreground border-muted-foreground";
    }
  };

  const getSentimentBg = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "bg-success/10";
      case "negative": return "bg-destructive/10";
      case "neutral": return "bg-muted/50";
      default: return "bg-muted/50";
    }
  };

  const allTags = Array.from(new Set(reviews.flatMap(review => review.ai_tags || [])));

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

  const getAverageRating = () =>
    reviews.length === 0 ? 0 : (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1);

  const getSentimentCounts = () => {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    reviews.forEach(r => { if (r.ai_sentiment) counts[r.ai_sentiment]++; });
    return counts;
  };

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

  const sentimentCounts = getSentimentCounts();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          {/* --- your UI below is unchanged --- */}
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
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reviews.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active reviews
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getAverageRating()}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of 5 stars
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Positive</CardTitle>
                  <div className="h-4 w-4 bg-success rounded-full" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentimentCounts.positive}</div>
                  <p className="text-xs text-muted-foreground">
                    Positive reviews
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Negative</CardTitle>
                  <div className="h-4 w-4 bg-destructive rounded-full" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentimentCounts.negative}</div>
                  <p className="text-xs text-muted-foreground">
                    Negative reviews
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Reviews</CardTitle>
                <CardDescription>Filter reviews by search, sentiment, rating, and tags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sentiment</label>
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sentiments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiments</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Ratings" />
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger>
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
                        : "Try adjusting your filters to see more reviews."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredReviews.map((review) => (
                  <Card key={review.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{review.author_name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.review_date), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {review.ai_sentiment && (
                            <Badge 
                              variant="outline" 
                              className={`${getSentimentColor(review.ai_sentiment)} ${getSentimentBg(review.ai_sentiment)}`}
                            >
                              {review.ai_sentiment}
                            </Badge>
                          )}
                          <ReplyDialog review={review} onReplySubmitted={fetchReviews} />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {review.text && (
                        <p className="text-muted-foreground mb-4">{review.text}</p>
                      )}
                      
                      {review.ai_tags && review.ai_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {review.ai_tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {review.reply_text && (
                        <div className="bg-muted/50 p-4 rounded-lg mt-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">Business Reply</Badge>
                            {review.reply_date && (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(review.reply_date), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{review.reply_text}</p>
                        </div>
                      )}
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
