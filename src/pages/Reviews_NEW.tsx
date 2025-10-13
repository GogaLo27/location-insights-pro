// THIS IS THE NEW OPTIMIZED VERSION
// TODO: Review this, test it, then replace Reviews.tsx with this file

import { useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, Star, Filter, RefreshCw, MessageSquare, Bot, Loader2, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "@/contexts/LocationContext";
import { usePaginatedReviews } from "@/hooks/usePaginatedReviews";
import ReplyDialog from "@/components/ReplyDialog";
import LocationSelector from "@/components/LocationSelector";
import { SyncButton } from "@/components/SyncButton";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";

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
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  ai_analyzed_at?: string | null;
}

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = useLocation();
  const { canUseAIAnalysis, canUseAIReplyGeneration, planType } = usePlanFeatures();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  
  // Get location ID
  const locationId = (() => {
    const sl: any = selectedLocation;
    if (!sl) return '';
    const direct = sl?.id || sl?.location_id;
    if (direct) return String(direct);
    const gp: string | undefined = sl?.google_place_id;
    const tail = gp ? gp.split('/').pop() : '';
    return tail || '';
  })();

  // USE THE PAGINATION HOOK!
  const {
    reviews,
    loading,
    hasMore,
    totalCount,
    loadMore,
    refresh,
  } = usePaginatedReviews({
    locationId,
    pageSize: 50,
    sentimentFilter: sentimentFilter === 'all' ? undefined : sentimentFilter,
    ratingFilter: ratingFilter === 'all' ? undefined : Number(ratingFilter),
    searchTerm: searchTerm || undefined,
  });

  // Filter reviews locally (for tags and additional client-side filtering)
  const filteredReviews = reviews.filter(review => {
    if (searchTerm && !review.author_name.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !review.text?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Helper functions
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "text-green-600";
      case "negative": return "text-red-600";
      case "neutral": return "text-gray-600";
      default: return "text-gray-400";
    }
  };

  const getSentimentBg = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "bg-green-50";
      case "negative": return "bg-red-50";
      case "neutral": return "bg-gray-50";
      default: return "bg-gray-50";
    }
  };

  // Auth check
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!selectedLocation) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <h1 className="text-xl font-semibold">Reviews</h1>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4">
              <Card>
                <CardHeader>
                  <CardTitle>No Location Selected</CardTitle>
                  <CardDescription>
                    Please select a location from your dashboard to view reviews.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center justify-between w-full space-x-4 ml-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold">Reviews</h1>
                <LocationSelector />
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'Starter'} Plan
                </div>
              </div>
              {/* Sync Button */}
              {locationId && (
                <SyncButton 
                  locationId={locationId} 
                  onSyncComplete={refresh}
                />
              )}
            </div>
          </header>

          <div className="flex flex-1 flex-col gap-4 p-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Showing {filteredReviews.length}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Positive</CardTitle>
                  <Star className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {reviews.filter(r => r.ai_sentiment === 'positive').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Negative</CardTitle>
                  <Star className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {reviews.filter(r => r.ai_sentiment === 'negative').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Neutral</CardTitle>
                  <Star className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">
                    {reviews.filter(r => r.ai_sentiment === 'neutral').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Reviews</CardTitle>
                <CardDescription>Filter reviews by search, sentiment, and rating</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sentiment</label>
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiments</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating</label>
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
            <div className="space-y-4">
              {loading && reviews.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Loading reviews...</p>
                  </CardContent>
                </Card>
              ) : filteredReviews.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p>No reviews found</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {filteredReviews.map((review) => (
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
                            {review.reply_text ? (
                              <Badge variant="outline" className="text-success border-success bg-success/10">
                                ✓ Replied
                              </Badge>
                            ) : (
                              <ReplyDialog review={review} onReplySubmitted={refresh} />
                            )}
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
                          <div className="bg-gradient-to-r from-success/5 to-success/10 border-l-4 border-success p-4 rounded-lg mt-4">
                            <div className="flex items-center space-x-2 mb-3">
                              <Badge variant="outline" className="text-success border-success bg-white">
                                Business Response
                              </Badge>
                              {review.reply_date && (
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {format(new Date(review.reply_date), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                            <p className="text-sm leading-relaxed">{review.reply_text}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={loadMore}
                        disabled={loading}
                        className="w-full sm:w-auto"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4 mr-2" />
                            Load More Reviews
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {!hasMore && reviews.length > 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      All reviews loaded ({totalCount} total)
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;





