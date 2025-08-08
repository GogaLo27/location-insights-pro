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

  const fetchReviews = async () => {
    if (!selectedLocation?.google_place_id) return;
    
    setLoading(true);
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: {
          action: "fetch_reviews",
          locationId: selectedLocation.google_place_id.split('/').pop() || selectedLocation.google_place_id,
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) throw error;
      
      // Analyze reviews with AI
      const reviewsData = data.reviews || [];
      if (reviewsData.length > 0) {
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-review-analysis', {
            body: { reviews: reviewsData },
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!analysisError && analysisData?.reviews) {
            setReviews(analysisData.reviews);
          } else {
            setReviews(reviewsData);
          }
        } catch (analysisError) {
          console.error('Error analyzing reviews:', analysisError);
          setReviews(reviewsData);
        }
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive",
      });
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

  // Get unique tags for filter
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

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    return (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1);
  };

  const getSentimentCounts = () => {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    reviews.forEach(review => {
      if (review.ai_sentiment) {
        counts[review.ai_sentiment]++;
      }
    });
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
            {selectedLocation && (
              <div>
                <h1 className="text-3xl font-bold mb-2">{selectedLocation.location_name} Reviews</h1>
                <p className="text-muted-foreground mb-6">
                  Manage and respond to customer reviews for this location
                </p>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Reviews</p>
                      <p className="text-2xl font-bold text-accent">{reviews.length}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-accent" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Rating</p>
                      <div className="flex items-center gap-1">
                        <p className="text-2xl font-bold text-accent">{getAverageRating()}</p>
                        <Star className="h-5 w-5 text-accent fill-accent" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Positive</p>
                      <p className="text-2xl font-bold text-green-600">{sentimentCounts.positive}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Negative</p>
                      <p className="text-2xl font-bold text-red-600">{sentimentCounts.negative}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-accent" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-accent/20 focus:border-accent"
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
                <Card className="border-accent/20">
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                    <p className="text-muted-foreground">
                      {reviews.length === 0 ? "No reviews available for this location." : "No reviews match your current filters."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredReviews.map((review) => (
                  <Card key={review.id} className={`border-accent/20 ${getSentimentBg(review.ai_sentiment)}`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">{review.author_name}</h3>
                            {review.ai_sentiment && (
                              <Badge variant="outline" className={getSentimentColor(review.ai_sentiment)}>
                                {review.ai_sentiment}
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(review.review_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (review.rating || 0)
                                    ? "text-accent fill-accent"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          
                          {review.text && (
                            <p className="text-foreground mb-3 leading-relaxed">
                              "{review.text}"
                            </p>
                          )}
                          
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
                            <div className="mt-4 p-3 bg-accent/5 border-l-2 border-accent rounded-r">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                                  <span className="text-xs text-white font-medium">B</span>
                                </div>
                                <span className="text-sm font-medium text-accent">Business Reply</span>
                                {review.reply_date && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(review.reply_date), 'MMM dd, yyyy')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-foreground">{review.reply_text}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <ReplyDialog 
                            review={review} 
                            onReplySubmitted={fetchReviews}
                          />
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