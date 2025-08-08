import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, MessageSquare, Star, Calendar as CalendarIcon, Filter, Reply, Search, BarChart3 } from "lucide-react";
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
  ai_sentiment: 'positive' | 'negative' | 'neutral' | null;
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
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  useEffect(() => {
    if (user) {
      fetchLocations();
      fetchReviews();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, google_place_id')
        .eq('user_id', user?.id);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive",
      });
    }
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('reviews')
        .select(`
          *,
          locations!inner(name)
        `)
        .eq('locations.user_id', user?.id)
        .order('review_date', { ascending: false });

      if (selectedLocation !== "all") {
        query = query.eq('location_id', selectedLocation);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const reviewsWithLocation = (data || []).map(review => ({
        ...review,
        location_name: review.locations?.name
      }));
      
      setReviews(reviewsWithLocation);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefetchReviews = async (locationId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_reviews',
          location_id: locationId 
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reviews refreshed successfully",
      });
      
      fetchReviews();
    } catch (error) {
      console.error('Error refreshing reviews:', error);
      toast({
        title: "Error",
        description: "Failed to refresh reviews",
        variant: "destructive",
      });
    }
  };

  const handleReplyToReview = async (reviewId: string, replyText: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'reply_to_review',
          review_id: reviewId,
          reply_text: replyText
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reply sent successfully",
      });
      
      fetchReviews();
    } catch (error) {
      console.error('Error replying to review:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = !searchTerm || 
      review.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.author_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSentiment = sentimentFilter === "all" || review.ai_sentiment === sentimentFilter;
    const matchesRating = ratingFilter === "all" || review.rating.toString() === ratingFilter;
    
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Location Insights Pro</span>
            <nav className="flex items-center space-x-6 ml-8">
              <Button variant="ghost" onClick={() => window.location.href = '/dashboard'}>Dashboard</Button>
              <Button variant="ghost" onClick={() => window.location.href = '/locations'}>Locations</Button>
              <Button variant="outline">Reviews</Button>
              <Button variant="ghost" onClick={() => window.location.href = '/sentiment'}>Sentiment</Button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedLocation} onValueChange={(value) => {
              setSelectedLocation(value);
              fetchReviews();
            }}>
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
        </div>
      </header>

      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Customer Reviews</h1>
            <p className="text-muted-foreground">
              Manage and analyze your Google Business reviews with AI insights
            </p>
          </div>
          <Button onClick={() => handleRefetchReviews(selectedLocation !== "all" ? selectedLocation : undefined)}>
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
                <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
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
                  : "No reviews match your current filters."
                }
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
                          {review.location_name} • {format(new Date(review.review_date), 'MMM d, yyyy')}
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
                                ? 'text-yellow-400 fill-current' 
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      {review.ai_sentiment && (
                        <Badge 
                          variant={
                            review.ai_sentiment === 'positive' ? 'default' :
                            review.ai_sentiment === 'negative' ? 'destructive' : 'secondary'
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
                        <Badge key={index} variant="outline">{tag}</Badge>
                      ))}
                    </div>
                  )}
                  
                  {review.reply_text && (
                    <div className="bg-muted p-4 rounded-lg mb-4">
                      <p className="text-sm font-medium mb-1">Business Reply:</p>
                      <p className="text-sm">{review.reply_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {review.reply_date && format(new Date(review.reply_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                  
                  {!review.reply_text && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const replyText = prompt("Enter your reply:");
                        if (replyText) handleReplyToReview(review.google_review_id, replyText);
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
    </div>
  );
};

export default Reviews;