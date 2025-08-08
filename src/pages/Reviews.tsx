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
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { MessageSquare, Star, Filter, Search, Bot, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import { format } from "date-fns";
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
  ai_sentiment: 'positive' | 'negative' | 'neutral' | null;
  ai_tags: string[] | null;
  location_id: string;
  location_name?: string;
}

const REVIEWS_PER_PAGE = 15;

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { selectedLocation } = useLocation();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);

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
    if (user && selectedLocation) {
      fetchReviews();
    }
  }, [user, selectedLocation]);

  const fetchReviews = async () => {
    if (!selectedLocation) return;
    
    try {
      setLoading(true);
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        setReviews([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_reviews', 
          locationId: selectedLocation.google_place_id 
        },
        headers: {
          'Authorization': `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken,
        },
      });

      if (error) {
        console.error('fetch_reviews error:', error);
        setReviews([]);
        return;
      }

      setReviews(data?.reviews || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeReviews = async () => {
    if (!reviews.length) return;
    
    try {
      setAnalyzing(true);
      const { data, error } = await supabase.functions.invoke('ai-review-analysis', {
        body: { reviews: reviews.map(r => ({ id: r.id, text: r.text, rating: r.rating })) }
      });

      if (error) throw error;

      // Update reviews with AI analysis
      const analyzedReviews = data.reviews;
      setReviews(prev => prev.map(review => {
        const analyzed = analyzedReviews.find((a: any) => a.id === review.id);
        return analyzed ? { ...review, ai_sentiment: analyzed.ai_sentiment, ai_tags: analyzed.ai_tags } : review;
      }));

      toast({
        title: "Analysis Complete",
        description: `Analyzed ${analyzedReviews.length} reviews with AI`
      });
    } catch (error) {
      console.error('Error analyzing reviews:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze reviews with AI",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
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

  const totalPages = Math.ceil(filteredReviews.length / REVIEWS_PER_PAGE);
  const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
  const endIndex = startIndex + REVIEWS_PER_PAGE;
  const currentReviews = filteredReviews.slice(startIndex, endIndex);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "bg-gradient-to-r from-success/20 to-success/10 text-success border-success/20";
      case "negative": return "bg-gradient-to-r from-destructive/20 to-destructive/10 text-destructive border-destructive/20"; 
      case "neutral": return "bg-gradient-to-r from-muted/50 to-muted/30 text-muted-foreground border-muted-foreground/20";
      default: return "bg-muted/20 text-muted-foreground border-muted-foreground/20";
    }
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-4 border-muted border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-t from-primary/20 to-transparent animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-foreground">Loading Reviews</p>
            <p className="text-muted-foreground">Analyzing your customer feedback...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/10">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold">Reviews</h1>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              {selectedLocation && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-muted/50 rounded-lg border">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{selectedLocation.location_name}</span>
                </div>
              )}
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header with Stats */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Customer Reviews
                  </h1>
                  <p className="text-muted-foreground">
                    Manage and analyze your Google Business reviews with AI insights
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={fetchReviews} 
                    variant="outline"
                    className="hover-scale"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Refresh Reviews
                  </Button>
                  <Button 
                    onClick={analyzeReviews}
                    disabled={analyzing || !reviews.length}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 hover-scale"
                  >
                    {analyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-card via-card to-muted/20 border-accent/20 hover-scale">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                        <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card via-card to-accent/10 border-accent/20 hover-scale">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-2xl font-bold text-foreground">{averageRating}</p>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(parseFloat(averageRating))
                                    ? "text-accent fill-current"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <Star className="h-8 w-8 text-accent" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card via-card to-success/10 border-success/20 hover-scale">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Positive Reviews</p>
                        <p className="text-2xl font-bold text-success">
                          {reviews.filter(r => r.ai_sentiment === 'positive').length}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-success" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-card via-card to-destructive/10 border-destructive/20 hover-scale">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Needs Attention</p>
                        <p className="text-2xl font-bold text-destructive">
                          {reviews.filter(r => r.ai_sentiment === 'negative' && !r.reply_text).length}
                        </p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Filters */}
            <Card className="border-accent/20 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg">
                  <Filter className="w-5 h-5 mr-2 text-primary" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Reviews</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Search content or author..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-accent/20 focus:border-accent"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sentiment</label>
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                      <SelectTrigger className="border-accent/20 focus:border-accent">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger className="border-accent/20 focus:border-accent">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Page</label>
                    <div className="flex items-center text-sm text-muted-foreground">
                      {filteredReviews.length > 0 ? (
                        <>
                          {startIndex + 1}-{Math.min(endIndex, filteredReviews.length)} of {filteredReviews.length}
                        </>
                      ) : (
                        "No reviews"
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            {currentReviews.length === 0 ? (
              <Card className="border-accent/20">
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
                  <p className="text-muted-foreground mb-6">
                    {reviews.length === 0
                      ? selectedLocation 
                        ? "No reviews available for this location yet."
                        : "Please select a location to view reviews."
                      : "No reviews match your current filters."}
                  </p>
                  {selectedLocation && reviews.length === 0 && (
                    <Button onClick={fetchReviews} className="hover-scale">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Fetch Reviews
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {currentReviews.map((review) => (
                  <Card key={review.id} className="border-accent/20 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card via-card to-muted/10">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
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
                            <h4 className="font-semibold text-foreground">{review.author_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(review.review_date), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${
                                  i < review.rating 
                                    ? "text-accent fill-current drop-shadow-sm" 
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          {review.ai_sentiment && (
                            <Badge className={`${getSentimentColor(review.ai_sentiment)} shadow-sm`}>
                              {review.ai_sentiment}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {review.text && (
                        <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-accent/10">
                          <p className="text-foreground leading-relaxed italic">"{review.text}"</p>
                        </div>
                      )}

                      {review.ai_tags && review.ai_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {review.ai_tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="bg-accent/10 text-accent border-accent/20">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {review.reply_text && (
                        <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-4 rounded-lg border border-primary/20 mb-4">
                          <div className="flex items-center mb-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                              <MessageSquare className="w-4 h-4 text-white" />
                            </div>
                            <p className="text-sm font-medium ml-2 text-primary">Business Reply</p>
                            {review.reply_date && (
                              <p className="text-xs text-muted-foreground ml-auto">
                                {format(new Date(review.reply_date), "MMM d, yyyy")}
                              </p>
                            )}
                          </div>
                          <p className="text-foreground pl-10">{review.reply_text}</p>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-accent/10">
                        <div className="text-sm text-muted-foreground">
                          Review ID: {review.google_review_id.split('/').pop()?.substring(0, 8)}...
                        </div>
                        {!review.reply_text && (
                          <ReplyDialog 
                            review={review}
                            onReplySubmitted={fetchReviews}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "hover-scale cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {[...Array(totalPages)].map((_, i) => {
                          const pageNumber = i + 1;
                          const isCurrentPage = pageNumber === currentPage;
                          const showPage = pageNumber === 1 || pageNumber === totalPages || 
                                         Math.abs(pageNumber - currentPage) <= 1;
                          
                          if (!showPage) {
                            if (pageNumber === 2 && currentPage > 4) {
                              return (
                                <PaginationItem key="ellipsis1">
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            if (pageNumber === totalPages - 1 && currentPage < totalPages - 3) {
                              return (
                                <PaginationItem key="ellipsis2">
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          }
                          
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                onClick={() => setCurrentPage(pageNumber)}
                                isActive={isCurrentPage}
                                className="hover-scale cursor-pointer"
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "hover-scale cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;