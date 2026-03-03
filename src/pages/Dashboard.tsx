import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleBarChart, SimpleLineChart, SimplePieChart } from "@/components/ui/charts";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import { MapPin, BarChart3, MessageSquare, Settings, TrendingUp, Star, Reply, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { format } from "date-fns";
import { DEMO_EMAIL, getDemoReviewsForLocation, mockLocations } from "@/utils/mockData";
import { useCampaignSignupTracking } from "@/hooks/useCampaignSignupTracking";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_plan: string;
  locations_limit: number;
  reviews_limit: number;
}

interface DashboardStats {
  totalLocations: number;
  totalReviews: number;
  averageRating: number;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { selectedLocation, locations } = useLocation();
  const { maxLocations } = usePlanFeatures();
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Track campaign signup after Google auth
  useCampaignSignupTracking();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      setStatsLoading(true);
      fetchProfile();
      fetchDashboardStats();
      fetchRecentReviews();
    }
  }, [user, selectedLocation, maxLocations, locations]);


  const fetchProfile = async () => {
    try {
      // Use dynamic location limits based on current plan
      setProfile({
        id: user?.id || '',
        email: user?.email || '',
        full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
        subscription_plan: 'free',
        locations_limit: maxLocations,
        reviews_limit: 100,
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      if (!selectedLocation) {
        setStats({
          totalLocations: 0,
          totalReviews: 0,
          averageRating: 0,
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 }
        });
        return;
      }

      // Demo: synthesize stats
      if (user?.email === DEMO_EMAIL) {
        const demoPlaceId: string | undefined = (selectedLocation as any).google_place_id;
        const match = demoPlaceId ? mockLocations.find(l => l.google_place_id === demoPlaceId) : undefined;
        const demoLocationId = match?.id || 'demo-location-1';
        const reviews = getDemoReviewsForLocation(demoLocationId);
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 
          ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / totalReviews 
          : 0;
        
        const sentimentCounts = reviews.reduce((acc: any, r: any) => {
          // Use AI sentiment if available, otherwise fallback to rating-based sentiment
          let sentiment = r.ai_sentiment;
          if (!sentiment) {
            // Fallback: 4-5 stars = positive, 1-2 = negative, 3 = neutral
            if (r.rating >= 4) sentiment = 'positive';
            else if (r.rating <= 2) sentiment = 'negative';
            else sentiment = 'neutral';
          }
          acc[sentiment] = (acc[sentiment] || 0) + 1;
          return acc;
        }, {});

        setStats({
          totalLocations: 1,
          totalReviews,
          averageRating,
          sentimentBreakdown: {
            positive: sentimentCounts.positive || 0,
            negative: sentimentCounts.negative || 0,
            neutral: sentimentCounts.neutral || 0,
          }
        });
        return;
      }

      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        setStats({
          totalLocations: 0,
          totalReviews: 0,
          averageRating: 0,
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 }
        });
        return;
      }

      const locationId = selectedLocation.google_place_id.split('/').pop();
      
      // Get reviews from saved_reviews table - FETCH IN CHUNKS
      let allReviews: any[] = [];
      let hasMore = true;
      let offset = 0;
      const chunkSize = 1000;

      while (hasMore) {
        const { data: chunk, error: chunkError } = await supabase
          .from('saved_reviews')
          .select('*')
          .eq('location_id', locationId)
          .range(offset, offset + chunkSize - 1);

        if (chunkError) break;

        const chunkLength = chunk?.length || 0;
        if (chunk && chunk.length > 0) {
          allReviews.push(...chunk);
        }

        if (chunkLength < chunkSize) {
          hasMore = false;
        } else {
          offset += chunkSize;
        }
      }

      const reviews = allReviews;
      const error = null;

      if (!error && reviews) {
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0 
          ? reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / totalReviews 
          : 0;
        
        const sentimentCounts = reviews.reduce((acc: any, r: any) => {
          // Use AI sentiment if available, otherwise fallback to rating-based sentiment
          let sentiment = r.ai_sentiment;
          if (!sentiment) {
            // Fallback: 4-5 stars = positive, 1-2 = negative, 3 = neutral
            if (r.rating >= 4) sentiment = 'positive';
            else if (r.rating <= 2) sentiment = 'negative';
            else sentiment = 'neutral';
          }
          acc[sentiment] = (acc[sentiment] || 0) + 1;
          return acc;
        }, {});

        setStats({
          totalLocations: 1,
          totalReviews,
          averageRating,
          sentimentBreakdown: {
            positive: sentimentCounts.positive || 0,
            negative: sentimentCounts.negative || 0,
            neutral: sentimentCounts.neutral || 0,
          }
        });
      } else {
        setStats({
          totalLocations: 1,
          totalReviews: 0,
          averageRating: 0,
          sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats({
        totalLocations: 0,
        totalReviews: 0,
        averageRating: 0,
        sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 }
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRecentReviews = async () => {
    try {
      if (!selectedLocation) {
        setRecentReviews([]);
        return;
      }

      // Demo recent reviews
      if (user?.email === DEMO_EMAIL) {
        const demoPlaceId: string | undefined = (selectedLocation as any).google_place_id;
        const match = demoPlaceId ? mockLocations.find(l => l.google_place_id === demoPlaceId) : undefined;
        const demoLocationId = match?.id || 'demo-location-1';
        const reviews = getDemoReviewsForLocation(demoLocationId).slice(0, 5);
        setRecentReviews(reviews);
        return;
      }

      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        setRecentReviews([]);
        return;
      }

      const locationId = selectedLocation.google_place_id.split('/').pop();
      const { data: reviews, error } = await supabase
        .from('saved_reviews')
        .select('*')
        .eq('location_id', locationId)
        .order('review_date', { ascending: false })
        .limit(5);

      if (!error && reviews) {
        setRecentReviews(reviews);
      }
    } catch (error) {
      console.error('Error fetching recent reviews:', error);
      setRecentReviews([]);
    }
  };

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

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || profileLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/5">
        <div className="text-center animate-fade-in">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary animate-glow-pulse" />
          </div>
          <p className="text-lg font-medium text-foreground">Loading your dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">Preparing your insights...</p>
        </div>
      </div>
    );
  }

  // Chart data
  const sentimentChartData = stats ? [
    { name: 'Positive', value: stats.sentimentBreakdown.positive },
    { name: 'Negative', value: stats.sentimentBreakdown.negative },
    { name: 'Neutral', value: stats.sentimentBreakdown.neutral },
  ].filter(item => item.value > 0) : [];

  const ratingTrendData = [
    { name: 'Jan', value: 4.2 },
    { name: 'Feb', value: 4.1 },
    { name: 'Mar', value: 4.4 },
    { name: 'Apr', value: 4.3 },
    { name: 'May', value: 4.5 },
    { name: 'Jun', value: stats?.averageRating || 4.2 },
  ];

  const statCardBase =
    "rounded-2xl border bg-card/80 backdrop-blur-sm shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elegant hover:border-primary/20 dark:hover:border-primary/30";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <AppSidebar />
        <SidebarInset className="relative overflow-x-hidden">
          {/* Decorative background orbs */}
          <div className="pointer-events-none absolute top-20 right-0 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl -z-10" aria-hidden />
          <div className="pointer-events-none absolute bottom-1/4 left-0 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-accent/10 dark:bg-accent/15 blur-3xl -z-10" aria-hidden />
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-3 sm:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex flex-1 items-center justify-between gap-4 ml-2 sm:ml-4">
              <LocationSelector />
            </div>
          </header>
          <div className="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-6 lg:p-8 pt-6">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 opacity-0 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent dark:to-primary/90">
            Welcome back, {profile?.full_name || user?.email?.split("@")[0] || "there"}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Manage your Google Business locations and reviews from one powerful dashboard.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className={`${statCardBase} ${maxLocations !== -1 && locations && locations.length >= maxLocations * 0.8 ? "border-orange-300 dark:border-orange-600 bg-orange-50/50 dark:bg-orange-950/20" : ""} opacity-0 animate-fade-in-up [animation-delay:80ms]`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tabular-nums">{locations?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                of {maxLocations === -1 ? "∞" : maxLocations} allowed
              </p>
              {maxLocations !== -1 && locations && locations.length >= maxLocations * 0.8 && locations.length < maxLocations && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">⚠️ Approaching limit</p>
              )}
              {maxLocations !== -1 && locations && locations.length >= maxLocations && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">🚫 Limit reached</p>
              )}
            </CardContent>
          </Card>
          <Card className={`${statCardBase} opacity-0 animate-fade-in-up [animation-delay:160ms]`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tabular-nums">{stats?.totalReviews ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">across all locations</p>
            </CardContent>
          </Card>
          <Card className={`${statCardBase} opacity-0 animate-fade-in-up [animation-delay:240ms]`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tabular-nums">{stats?.averageRating.toFixed(1) ?? "0.0"}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{stats?.totalReviews ? "from customer reviews" : "no reviews yet"}</p>
            </CardContent>
          </Card>
          <Card className={`${statCardBase} opacity-0 animate-fade-in-up [animation-delay:320ms]`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold tabular-nums">
                {stats?.sentimentBreakdown?.positive && stats?.totalReviews
                  ? Math.round((stats.sentimentBreakdown.positive / stats.totalReviews) * 100) + "%"
                  : "-%"}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">positive sentiment</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className={`${statCardBase} opacity-0 animate-fade-in-up [animation-delay:360ms]`}>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Sentiment Analysis</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Distribution of customer sentiment across reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentimentChartData.length > 0 ? (
                <SimplePieChart data={sentimentChartData} />
              ) : (
                <div className="h-[240px] sm:h-[300px] flex items-center justify-center text-muted-foreground rounded-xl bg-muted/30">
                  <div className="text-center">
                    <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No sentiment data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className={`${statCardBase} opacity-0 animate-fade-in-up [animation-delay:420ms]`}>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Rating Trend</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Average rating over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={ratingTrendData} />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {(!locations || locations.length === 0) ? (
          <Card className={`mb-6 sm:mb-8 rounded-2xl border shadow-soft overflow-hidden opacity-0 animate-fade-in-up [animation-delay:480ms]`}>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                You haven&apos;t connected any Google Business locations yet. Start by adding your first location to unlock powerful insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8 sm:py-10">
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 dark:bg-primary/20 mb-4">
                  <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No locations found</h3>
                <p className="text-muted-foreground mb-6 text-sm sm:text-base max-w-md mx-auto">
                  Connect your Google Business Profile to start analyzing your reviews and performance.
                </p>
                <Button
                  onClick={() => navigate("/locations")}
                  className="bg-gradient-to-r from-primary to-accent text-white shadow-elegant hover:shadow-glow hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98]"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Add Your First Location
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { href: "/locations", icon: MapPin, label: "Locations", desc: "Manage business locations" },
            { href: "/reviews", icon: MessageSquare, label: "Reviews", desc: "Analyze customer feedback" },
            { href: "/sentiment", icon: BarChart3, label: "Sentiment", desc: "AI sentiment analysis" },
            { href: "/settings", icon: Settings, label: "Settings", desc: "Account preferences" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.href}
                className={`${statCardBase} cursor-pointer opacity-0 animate-fade-in-up group`}
                style={{ animationDelay: `${400 + i * 80}ms` }}
                onClick={() => navigate(item.href)}
              >
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="inline-flex p-3 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20 dark:group-hover:bg-primary/30">
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-0.5">{item.label}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        )}

        {/* Recent Reviews Section */}
        {recentReviews.length > 0 && (
          <Card className={`mb-6 sm:mb-8 rounded-2xl border shadow-soft overflow-hidden opacity-0 animate-fade-in-up`} style={{ animationDelay: "520ms" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recent Reviews
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Latest customer feedback from {selectedLocation?.location_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentReviews.map((review, index) => (
                <div
                  key={index}
                  className="border-b border-border/50 pb-4 last:border-b-0 last:pb-0 transition-colors hover:bg-muted/20 rounded-lg px-3 -mx-3 py-2"
                  style={{ animationDelay: `${580 + index * 60}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      {review.author_photo_url ? (
                        <img
                          src={review.author_photo_url}
                          alt={review.author_name}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-border"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {review.author_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{review.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.review_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              i < (review.rating || 0) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
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
                          className="text-xs capitalize"
                        >
                          {review.ai_sentiment}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {review.text && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2 pl-11 sm:pl-0">&ldquo;{review.text}&rdquo;</p>
                  )}
                  {review.reply_text && (
                    <div className="bg-muted/30 dark:bg-muted/20 p-3 rounded-lg text-xs border border-border/50 ml-11 sm:ml-0">
                      <div className="flex items-center gap-1 mb-1">
                        <Reply className="w-3 h-3 text-primary" />
                        <span className="font-medium">Your Reply:</span>
                      </div>
                      <p className="text-muted-foreground">{review.reply_text}</p>
                    </div>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full mt-4 rounded-xl border-2 hover:bg-primary/10 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                onClick={() => navigate("/reviews")}
              >
                View All Reviews
              </Button>
            </CardContent>
          </Card>
        )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;