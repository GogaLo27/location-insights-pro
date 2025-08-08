import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import ReplyDialog from "@/components/ReplyDialog";
import { Star, Sparkles, Brain, TrendingUp, MessageSquare, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import { format } from "date-fns";

interface Review {
  id: string;
  google_review_id: string;
  author_name: string;
  author_photo_url: string | null;
  rating: number;
  text: string | null;
  review_date: string;
  reply_text: string | null;
  reply_date: string | null;
  ai_sentiment: "positive" | "negative" | "neutral" | null;
  ai_tags: string[];
  location_id: string;
}

interface ReviewAnalysis {
  id: string;
  review_id: string;
  sentiment: "positive" | "negative" | "neutral";
  tags: string[];
  analyzed_at: string;
}

interface AnalysisProgress {
  total: number;
  analyzed: number;
  isAnalyzing: boolean;
}

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = useLocation();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    total: 0,
    analyzed: 0,
    isAnalyzing: false
  });
  
  const reviewsPerPage = 15;
  const totalPages = Math.ceil(totalReviews / reviewsPerPage);

  useEffect(() => {
    if (user && selectedLocation) {
      fetchReviews();
      loadAnalysisProgress();
    }
  }, [user, selectedLocation, currentPage]);

  useEffect(() => {
    // Check if analysis is still in progress on mount
    const savedProgress = localStorage.getItem('reviewAnalysisProgress');
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      if (progress.isAnalyzing) {
        setAnalysisProgress(progress);
        // Continue monitoring progress
        monitorAnalysisProgress();
      }
    }
  }, []);

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
    if (!selectedLocation) return;
    
    try {
      setLoading(true);
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      
      if (!supabaseJwt || !googleAccessToken) {
        toast({
          title: "Authentication Required",
          description: "Please sign in with Google to access reviews",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetching reviews for location:', selectedLocation.google_place_id);
      
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_reviews',
          locationId: selectedLocation.google_place_id
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken,
        },
      });

      console.log('Google API response:', { data, error });

      if (error) {
        console.error('Error fetching reviews:', error);
        toast({
          title: "Error",
          description: "Failed to fetch reviews. Please try again.",
          variant: "destructive",
        });
        setReviews([]);
        return;
      }

      if (data?.reviews && Array.isArray(data.reviews)) {
        console.log(`Found ${data.reviews.length} reviews from Google API`);
        
        // Try to get existing analyses from database using google_review_id as text
        let analyses = [];
        try {
          const { data: analysisData, error: analysisError } = await supabase
            .from('review_analyses')
            .select('review_id, ai_sentiment, ai_tags')
            .eq('user_id', user?.id);
          
          console.log('Analysis query result:', { analysisData, analysisError });
          
          if (!analysisError && analysisData) {
            analyses = analysisData;
          }
        } catch (analysisError) {
          console.error('Error fetching analyses:', analysisError);
        }

        // Merge analyses with reviews
        const reviewsWithAnalysis = data.reviews.map((review: any) => {
          const analysis = analyses?.find(a => a.review_id === review.google_review_id);
          return {
            ...review,
            ai_sentiment: analysis?.ai_sentiment || null,
            ai_tags: analysis?.ai_tags || []
          };
        });

        // Sort by date (newest first) and paginate
        const sortedReviews = reviewsWithAnalysis.sort((a: any, b: any) => 
          new Date(b.review_date).getTime() - new Date(a.review_date).getTime()
        );
        
        setTotalReviews(sortedReviews.length);
        const startIndex = (currentPage - 1) * reviewsPerPage;
        const paginatedReviews = sortedReviews.slice(startIndex, startIndex + reviewsPerPage);
        
        setReviews(paginatedReviews);
        
        // Calculate average rating
        const avgRating = sortedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / sortedReviews.length;
        setAverageRating(avgRating || 0);
        
        console.log(`Displaying ${paginatedReviews.length} reviews on page ${currentPage}`);
      } else {
        console.log('No reviews found in API response');
        setReviews([]);
        setTotalReviews(0);
        setAverageRating(0);
      }
    } catch (error) {
      console.error('Error in fetchReviews:', error);
      setReviews([]);
      setTotalReviews(0);
      setAverageRating(0);
      toast({
        title: "Error",
        description: "Failed to load reviews. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysisProgress = async () => {
    if (!selectedLocation) return;
    
    try {
      // Get total reviews count
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      const { data } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_reviews',
          locationId: selectedLocation.google_place_id
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken,
        },
      });

      const totalReviews = data?.reviews?.length || 0;

      // Get analyzed reviews count
      const { count } = await supabase
        .from('review_analyses')
        .select('*', { count: 'exact', head: true });

      setAnalysisProgress(prev => ({
        ...prev,
        total: totalReviews,
        analyzed: count || 0
      }));
    } catch (error) {
      console.error('Error loading analysis progress:', error);
    }
  };

  const startAnalysis = async () => {
    if (!selectedLocation) return;
    
    try {
      setAnalysisProgress(prev => ({ ...prev, isAnalyzing: true }));
      
      // Save progress to localStorage
      const progressData = { ...analysisProgress, isAnalyzing: true };
      localStorage.setItem('reviewAnalysisProgress', JSON.stringify(progressData));
      
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      
      // Get all reviews
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_reviews',
          locationId: selectedLocation.google_place_id
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken,
        },
      });

      if (error || !data?.reviews) {
        throw new Error('Failed to fetch reviews');
      }

      // Get already analyzed reviews
      const { data: existingAnalyses } = await supabase
        .from('review_analyses')
        .select('review_id');

      const analyzedIds = new Set(existingAnalyses?.map(a => a.review_id) || []);
      const reviewsToAnalyze = data.reviews.filter((r: any) => !analyzedIds.has(r.google_review_id));

      setAnalysisProgress(prev => ({
        ...prev,
        total: data.reviews.length,
        analyzed: data.reviews.length - reviewsToAnalyze.length
      }));

      if (reviewsToAnalyze.length === 0) {
        toast({
          title: "Analysis Complete",
          description: "All reviews have already been analyzed!",
        });
        setAnalysisProgress(prev => ({ ...prev, isAnalyzing: false }));
        localStorage.removeItem('reviewAnalysisProgress');
        return;
      }

      // Analyze reviews in batches
      const batchSize = 5;
      for (let i = 0; i < reviewsToAnalyze.length; i += batchSize) {
        const batch = reviewsToAnalyze.slice(i, i + batchSize);
        
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-review-analysis', {
            body: { reviews: batch }
          });

          if (!analysisError && analysisData?.reviews) {
            // Store analyses in database
            const analysesToInsert = analysisData.reviews.map((review: any) => ({
              review_id: review.google_review_id,
              ai_sentiment: review.ai_sentiment,
              ai_tags: review.ai_tags,
              user_id: user?.id
            }));

            await supabase.from('review_analyses').insert(analysesToInsert);
            
            // Update progress
            setAnalysisProgress(prev => {
              const newProgress = {
                ...prev,
                analyzed: prev.analyzed + batch.length
              };
              localStorage.setItem('reviewAnalysisProgress', JSON.stringify(newProgress));
              return newProgress;
            });
          }
        } catch (batchError) {
          console.error('Error analyzing batch:', batchError);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Analysis complete
      setAnalysisProgress(prev => ({ ...prev, isAnalyzing: false }));
      localStorage.removeItem('reviewAnalysisProgress');
      
      toast({
        title: "Analysis Complete!",
        description: `Successfully analyzed ${reviewsToAnalyze.length} reviews`,
      });
      
      // Refresh reviews to show analysis results
      await fetchReviews();

    } catch (error) {
      console.error('Error during analysis:', error);
      setAnalysisProgress(prev => ({ ...prev, isAnalyzing: false }));
      localStorage.removeItem('reviewAnalysisProgress');
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze reviews. Please try again.",
        variant: "destructive",
      });
    }
  };

  const monitorAnalysisProgress = () => {
    const interval = setInterval(() => {
      loadAnalysisProgress();
      
      // Check if analysis is complete
      const savedProgress = localStorage.getItem('reviewAnalysisProgress');
      if (!savedProgress) {
        clearInterval(interval);
        setAnalysisProgress(prev => ({ ...prev, isAnalyzing: false }));
      }
    }, 2000);

    return () => clearInterval(interval);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating
                ? "text-accent fill-current"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "negative": return "text-red-600 bg-red-50 border-red-200";
      case "neutral": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-muted-foreground bg-muted/50 border-border";
    }
  };

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "😊";
      case "negative": return "😞";
      case "neutral": return "😐";
      default: return "🤔";
    }
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-sm">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-4">
              <LocationSelector />
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                  Customer Reviews
                </h1>
                <p className="text-muted-foreground text-lg">
                  Manage and respond to your Google Business reviews with AI insights
                </p>
              </div>
              
              {selectedLocation && (
                <div className="flex gap-3">
                  <Button
                    onClick={startAnalysis}
                    disabled={analysisProgress.isAnalyzing}
                    className="bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
                  >
                    {analysisProgress.isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Analyze Reviews
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {!selectedLocation ? (
              <Card className="border-2 border-dashed border-muted-foreground/25">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Select a Location</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Choose a location from the dropdown above to view and manage your reviews
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Analysis Progress */}
                {(analysisProgress.isAnalyzing || analysisProgress.analyzed > 0) && (
                  <Card className="bg-gradient-to-r from-accent/5 to-primary/5 border-accent/20">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-accent" />
                          <CardTitle className="text-lg">AI Analysis Progress</CardTitle>
                        </div>
                        <Badge variant="outline" className="text-accent border-accent">
                          {analysisProgress.analyzed} / {analysisProgress.total}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Progress 
                        value={analysisProgress.total > 0 ? (analysisProgress.analyzed / analysisProgress.total) * 100 : 0} 
                        className="h-3 bg-muted"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        {analysisProgress.isAnalyzing 
                          ? "Analyzing reviews with AI sentiment and tagging..."
                          : `Analysis complete! ${analysisProgress.analyzed} reviews analyzed.`
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Stats Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">{totalReviews}</div>
                      <p className="text-xs text-muted-foreground">
                        Across all time
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-accent/10 to-accent/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                      <Star className="h-4 w-4 text-accent" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <div className="text-3xl font-bold text-accent">{averageRating.toFixed(1)}</div>
                        {renderStars(Math.round(averageRating))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Customer satisfaction
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">AI Analyzed</CardTitle>
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-600">{analysisProgress.analyzed}</div>
                      <p className="text-xs text-muted-foreground">
                        Reviews with AI insights
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Reviews List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading reviews...</p>
                    </div>
                  </div>
                ) : reviews.length === 0 ? (
                  <Card className="border-2 border-dashed border-muted-foreground/25">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No Reviews Found</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        This location doesn't have any reviews yet, or they might not be accessible.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="space-y-4">
                      {reviews.map((review, index) => (
                        <Card key={review.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-background to-muted/10">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-4">
                                {review.author_photo_url ? (
                                  <img
                                    src={review.author_photo_url}
                                    alt={review.author_name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-accent/20"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-semibold">
                                    {review.author_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-semibold text-foreground">{review.author_name}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    {renderStars(review.rating)}
                                    <span className="text-sm text-muted-foreground">
                                      {format(new Date(review.review_date), 'MMM dd, yyyy')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {review.ai_sentiment && (
                                  <Badge className={`${getSentimentColor(review.ai_sentiment)} border`}>
                                    {getSentimentIcon(review.ai_sentiment)} {review.ai_sentiment}
                                  </Badge>
                                )}
                                <ReplyDialog 
                                  review={review} 
                                  onReplySubmitted={fetchReviews}
                                />
                              </div>
                            </div>
                            
                            {review.text && (
                              <p className="text-foreground mb-4 leading-relaxed">{review.text}</p>
                            )}
                            
                            {review.ai_tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {review.ai_tags.map((tag, tagIndex) => (
                                  <Badge key={tagIndex} variant="outline" className="text-xs bg-muted/50">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            
                            {review.reply_text && (
                              <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-accent/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                    <span className="text-xs text-white font-semibold">B</span>
                                  </div>
                                  <span className="font-medium text-sm">Business Response</span>
                                  {review.reply_date && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(review.reply_date), 'MMM dd, yyyy')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{review.reply_text}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-8">
                        <div className="text-sm text-muted-foreground">
                          Showing {((currentPage - 1) * reviewsPerPage) + 1} to {Math.min(currentPage * reviewsPerPage, totalReviews)} of {totalReviews} reviews
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, index) => {
                              const pageNum = index + 1;
                              if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                              ) {
                                return (
                                  <Button
                                    key={pageNum}
                                    variant={currentPage === pageNum ? "default" : "outline"}
                                    size="sm"
                                    className="w-8 h-8 p-0"
                                    onClick={() => setCurrentPage(pageNum)}
                                  >
                                    {pageNum}
                                  </Button>
                                );
                              } else if (
                                pageNum === currentPage - 2 ||
                                pageNum === currentPage + 2
                              ) {
                                return <span key={pageNum} className="text-muted-foreground">...</span>;
                              }
                              return null;
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;