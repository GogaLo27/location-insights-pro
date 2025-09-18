import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Users, 
  MessageSquare, 
  ArrowLeft,
  RefreshCw,
  Target,
  Award,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import LocationSelector from "@/components/LocationSelector";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface CompetitorData {
  id: string;
  competitor_name: string;
  average_rating: number;
  total_reviews: number;
  positive_reviews: number;
  negative_reviews: number;
  neutral_reviews: number;
  response_rate: number;
  last_updated: string;
}

interface YourBusinessData {
  average_rating: number;
  total_reviews: number;
  positive_reviews: number;
  negative_reviews: number;
  neutral_reviews: number;
  response_rate: number;
}

const CompetitorAnalysis = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { selectedLocation } = useLocation();
  const { canUseCompetitorAnalysis } = usePlanFeatures();
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [yourBusiness, setYourBusiness] = useState<YourBusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAnalysisData();
    }
  }, [user, selectedLocation]);

  const fetchAnalysisData = async () => {
    try {
      setLoading(true);
      
      // Fetch competitors data
      const { data: competitorsData, error: competitorsError } = await supabase
        .from('competitors')
        .select(`
          id,
          competitor_name,
          competitor_analytics (
            average_rating,
            total_reviews,
            positive_reviews,
            negative_reviews,
            neutral_reviews,
            response_rate,
            date
          )
        `)
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (competitorsError) throw competitorsError;

      // Process competitors data
      const processedCompetitors = (competitorsData || []).map(competitor => {
        const latestAnalytics = competitor.competitor_analytics?.[0];
        return {
          id: competitor.id,
          competitor_name: competitor.competitor_name,
          average_rating: latestAnalytics?.average_rating || 0,
          total_reviews: latestAnalytics?.total_reviews || 0,
          positive_reviews: latestAnalytics?.positive_reviews || 0,
          negative_reviews: latestAnalytics?.negative_reviews || 0,
          neutral_reviews: latestAnalytics?.neutral_reviews || 0,
          response_rate: latestAnalytics?.response_rate || 0,
          last_updated: latestAnalytics?.date || null
        };
      });

      setCompetitors(processedCompetitors);

      // Fetch your business data (from saved_reviews)
      if (selectedLocation) {
        const { data: yourReviews, error: reviewsError } = await supabase
          .from('saved_reviews')
          .select('rating, ai_sentiment')
          .eq('location_id', selectedLocation.google_place_id);

        if (!reviewsError && yourReviews) {
          const totalReviews = yourReviews.length;
          const averageRating = totalReviews > 0 
            ? yourReviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews 
            : 0;
          
          const positiveReviews = yourReviews.filter(r => r.ai_sentiment === 'positive').length;
          const negativeReviews = yourReviews.filter(r => r.ai_sentiment === 'negative').length;
          const neutralReviews = yourReviews.filter(r => r.ai_sentiment === 'neutral').length;

          setYourBusiness({
            average_rating: averageRating,
            total_reviews: totalReviews,
            positive_reviews: positiveReviews,
            negative_reviews: negativeReviews,
            neutral_reviews: neutralReviews,
            response_rate: 85 // TODO: Calculate actual response rate
          });
        }
      }

    } catch (error) {
      console.error('Error fetching analysis data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch competitor analysis data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);
      await fetchAnalysisData();
      toast({
        title: "Data Refreshed",
        description: "Competitor analysis data has been updated.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPerformanceInsights = () => {
    if (!yourBusiness || competitors.length === 0) return [];

    const insights = [];
    const marketAverage = competitors.reduce((sum, c) => sum + c.average_rating, 0) / competitors.length;
    const marketTotalReviews = competitors.reduce((sum, c) => sum + c.total_reviews, 0);

    // Rating comparison
    if (yourBusiness.average_rating > marketAverage) {
      insights.push({
        type: 'positive',
        icon: TrendingUp,
        title: 'Above Market Average',
        description: `Your rating (${yourBusiness.average_rating.toFixed(1)}) is above the market average (${marketAverage.toFixed(1)})`
      });
    } else if (yourBusiness.average_rating < marketAverage) {
      insights.push({
        type: 'warning',
        icon: TrendingDown,
        title: 'Below Market Average',
        description: `Your rating (${yourBusiness.average_rating.toFixed(1)}) is below the market average (${marketAverage.toFixed(1)})`
      });
    }

    // Review volume comparison
    const avgCompetitorReviews = marketTotalReviews / competitors.length;
    if (yourBusiness.total_reviews > avgCompetitorReviews) {
      insights.push({
        type: 'positive',
        icon: Users,
        title: 'High Review Volume',
        description: `You're getting more reviews (${yourBusiness.total_reviews}) than competitors (avg: ${avgCompetitorReviews.toFixed(0)})`
      });
    } else if (yourBusiness.total_reviews < avgCompetitorReviews) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Low Review Volume',
        description: `You're getting fewer reviews (${yourBusiness.total_reviews}) than competitors (avg: ${avgCompetitorReviews.toFixed(0)})`
      });
    }

    return insights;
  };

  const getChartData = () => {
    const data = [
      {
        name: 'Your Business',
        rating: yourBusiness?.average_rating || 0,
        reviews: yourBusiness?.total_reviews || 0,
        positive: yourBusiness?.positive_reviews || 0,
        negative: yourBusiness?.negative_reviews || 0,
        neutral: yourBusiness?.neutral_reviews || 0
      },
      ...competitors.map(competitor => ({
        name: competitor.competitor_name,
        rating: competitor.average_rating,
        reviews: competitor.total_reviews,
        positive: competitor.positive_reviews,
        negative: competitor.negative_reviews,
        neutral: competitor.neutral_reviews
      }))
    ];
    return data;
  };

  const getSentimentData = () => {
    if (!yourBusiness) return [];
    
    const data = [
      { name: 'Your Business', positive: yourBusiness.positive_reviews, negative: yourBusiness.negative_reviews, neutral: yourBusiness.neutral_reviews },
      ...competitors.map(competitor => ({
        name: competitor.competitor_name,
        positive: competitor.positive_reviews,
        negative: competitor.negative_reviews,
        neutral: competitor.neutral_reviews
      }))
    ];
    return data;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!canUseCompetitorAnalysis) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center space-x-4 ml-auto">
                <LocationSelector />
              </div>
            </header>
            <div className="flex-1 space-y-4 p-8 pt-6">
              <UpgradePrompt 
                feature="Competitor Analysis"
                title="Unlock Competitor Analysis"
                description="Monitor your competitors' review performance, compare ratings, and gain market insights to stay ahead of the competition."
                variant="page"
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  const insights = getPerformanceInsights();
  const chartData = getChartData();
  const sentimentData = getSentimentData();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-auto">
              <LocationSelector />
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => window.location.href = '/competitors'}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Competitors
                </Button>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Competitor Analysis</h1>
                  <p className="text-muted-foreground">
                    Compare your performance against competitors
                  </p>
                </div>
              </div>
              <Button onClick={handleRefreshData} disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading analysis data...</p>
              </div>
            ) : competitors.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No competitors to analyze</h3>
                  <p className="text-muted-foreground mb-6">
                    Add competitors first to start analyzing their performance.
                  </p>
                  <Button onClick={() => window.location.href = '/competitors'}>
                    Add Competitors
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Performance Insights */}
                {insights.length > 0 && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {insights.map((insight, index) => (
                      <Card key={index} className={`border-l-4 ${
                        insight.type === 'positive' ? 'border-l-green-500' : 
                        insight.type === 'warning' ? 'border-l-yellow-500' : 'border-l-red-500'
                      }`}>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <insight.icon className={`w-5 h-5 ${
                              insight.type === 'positive' ? 'text-green-600' : 
                              insight.type === 'warning' ? 'text-yellow-600' : 'text-red-600'
                            }`} />
                            <div>
                              <h4 className="font-semibold">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground">{insight.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Rating Comparison Chart */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Rating Comparison</CardTitle>
                    <CardDescription>Compare average ratings across competitors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 5]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="rating" fill="#8884d8" name="Average Rating" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Review Volume Comparison */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Review Volume Comparison</CardTitle>
                    <CardDescription>Compare total review counts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="reviews" fill="#82ca9d" name="Total Reviews" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Sentiment Analysis */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Sentiment Analysis Comparison</CardTitle>
                    <CardDescription>Compare positive, negative, and neutral reviews</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={sentimentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="positive" stackId="a" fill="#22c55e" name="Positive" />
                        <Bar dataKey="neutral" stackId="a" fill="#eab308" name="Neutral" />
                        <Bar dataKey="negative" stackId="a" fill="#ef4444" name="Negative" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Performance Summary Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Summary</CardTitle>
                    <CardDescription>Detailed comparison metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Business</th>
                            <th className="text-left p-2">Rating</th>
                            <th className="text-left p-2">Reviews</th>
                            <th className="text-left p-2">Positive</th>
                            <th className="text-left p-2">Neutral</th>
                            <th className="text-left p-2">Negative</th>
                            <th className="text-left p-2">Response Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chartData.map((business, index) => (
                            <tr key={index} className={`border-b ${index === 0 ? 'bg-primary/5' : ''}`}>
                              <td className="p-2 font-medium">
                                {business.name}
                                {index === 0 && <Badge variant="secondary" className="ml-2">Your Business</Badge>}
                              </td>
                              <td className="p-2">
                                <div className="flex items-center space-x-1">
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                  <span>{business.rating.toFixed(1)}</span>
                                </div>
                              </td>
                              <td className="p-2">{business.reviews}</td>
                              <td className="p-2 text-green-600">{business.positive}</td>
                              <td className="p-2 text-yellow-600">{business.neutral}</td>
                              <td className="p-2 text-red-600">{business.negative}</td>
                              <td className="p-2">{index === 0 ? '85%' : 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default CompetitorAnalysis;
