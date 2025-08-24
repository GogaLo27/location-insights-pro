import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import { MapPin, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

interface SentimentData {
  id: string;
  analysis_date: string;
  period_type: string;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  average_rating: number;
  top_positive_tags: string[] | null;
  top_negative_tags: string[] | null;
  top_issues: string[] | null;
  top_suggestions: string[] | null;
  sentiment_score: number;
  location_name?: string;
}

interface Location {
  id: string;
  name: string;
  google_place_id: string;
}

const Sentiment = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("monthly");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subMonths(new Date(), 6),
    to: new Date()
  });

  useEffect(() => {
    if (user) {
      fetchLocations();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSentimentData();
    }
  }, [user, selectedLocation, selectedPeriod, dateRange]);

  const fetchLocations = async () => {
    if (!user) return;

    try {
      // Check if demo user and use mock data
      if (user.email === 'demolip29@gmail.com') {
        const { mockLocations } = await import('@/utils/mockData');
        setLocations(mockLocations);
        return;
      }

      // Use edge function to get locations
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: {
          action: 'get_user_locations'
        }
      });

      if (!error && data?.locations) {
        setLocations(data.locations);
      } else {
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchSentimentData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if demo user and use mock data
      if (user.email === 'demolip29@gmail.com') {
        const { mockReviews } = await import('@/utils/mockData');
        let filteredReviews = mockReviews.filter(review => review.ai_sentiment !== null);

        if (selectedLocation !== "all") {
          filteredReviews = filteredReviews.filter(review => review.location_id === selectedLocation);
        }

        const processedData = processReviewsIntoSentimentData(filteredReviews);
        setSentimentData(processedData);
        return;
      }

      // Get sentiment data from saved reviews
      let query = supabase
        .from('saved_reviews')
        .select('*')
        .gte('review_date', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('review_date', format(dateRange.to, 'yyyy-MM-dd'))
        .not('ai_sentiment', 'is', null);

      if (selectedLocation !== "all") {
        query = query.eq('location_id', selectedLocation);
      }

      const { data: reviews, error } = await query;

      if (!error && reviews) {
        // Process reviews into sentiment data by period
        const processedData = processReviewsIntoSentimentData(reviews);
        setSentimentData(processedData);
      } else {
        setSentimentData([]);
      }
    } catch (error) {
      console.error('Error fetching sentiment data:', error);
      setSentimentData([]);
    } finally {
      setLoading(false);
    }
  };

  const processReviewsIntoSentimentData = (reviews: any[]): SentimentData[] => {
    const groupedData: { [key: string]: any } = {};

    reviews.forEach(review => {
      let key = '';
      const reviewDate = new Date(review.review_date);

      switch (selectedPeriod) {
        case 'daily':
          key = format(reviewDate, 'yyyy-MM-dd');
          break;
        case 'weekly':
          const weekStart = new Date(reviewDate);
          weekStart.setDate(reviewDate.getDate() - reviewDate.getDay());
          key = format(weekStart, 'yyyy-MM-dd');
          break;
        case 'monthly':
          key = format(reviewDate, 'yyyy-MM');
          break;
        case 'yearly':
          key = format(reviewDate, 'yyyy');
          break;
      }

      if (!groupedData[key]) {
        groupedData[key] = {
          id: key,
          analysis_date: key,
          period_type: selectedPeriod,
          positive_count: 0,
          negative_count: 0,
          neutral_count: 0,
          ratings: [],
          positive_tags: [],
          negative_tags: [],
          all_issues: [],
          all_suggestions: []
        };
      }

      // Count sentiment
      if (review.ai_sentiment === 'positive') groupedData[key].positive_count++;
      else if (review.ai_sentiment === 'negative') groupedData[key].negative_count++;
      else groupedData[key].neutral_count++;

      // Collect ratings and tags by sentiment
      groupedData[key].ratings.push(review.rating);
      if (review.ai_tags) {
        if (review.ai_sentiment === 'positive') {
          groupedData[key].positive_tags.push(...review.ai_tags);
        } else if (review.ai_sentiment === 'negative') {
          groupedData[key].negative_tags.push(...review.ai_tags);
        }
      }

      // Collect issues and suggestions - note these are arrays already from AI analysis
      if (review.ai_issues && Array.isArray(review.ai_issues)) {
        groupedData[key].all_issues.push(...review.ai_issues);
      }
      if (review.ai_suggestions && Array.isArray(review.ai_suggestions)) {
        groupedData[key].all_suggestions.push(...review.ai_suggestions);
      }
    });

    // Convert to final format
    return Object.values(groupedData).map((data: any) => ({
      ...data,
      average_rating: data.ratings.length > 0 ? data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length : 0,
      sentiment_score: data.positive_count > 0 ? (data.positive_count / (data.positive_count + data.negative_count + data.neutral_count)) * 100 : 0,
      top_positive_tags: getTopTags(data.positive_tags),
      top_negative_tags: getTopTags(data.negative_tags),
      top_issues: getTopItems(data.all_issues),
      top_suggestions: getTopItems(data.all_suggestions)
    }));
  };

  const getTopTags = (tags: string[]): string[] => {
    const tagCounts: { [key: string]: number } = {};
    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);
  };

  const getTopItems = (items: string[]): string[] => {
    const itemCounts: { [key: string]: number } = {};
    items.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });

    return Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([item]) => item);
  };

  const handleGenerateSentiment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-review-analysis', {
        body: {
          action: 'generate_sentiment_analysis',
          location_id: selectedLocation !== "all" ? selectedLocation : undefined,
          period_type: selectedPeriod,
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd')
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Sentiment analysis generated successfully",
      });

      fetchSentimentData();
    } catch (error) {
      console.error('Error generating sentiment analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate sentiment analysis",
        variant: "destructive",
      });
    }
  };

  const getPeriodOptions = () => [
    { value: "monthly", label: "Monthly" },
    { value: "weekly", label: "Weekly" },
    { value: "daily", label: "Daily" },
    { value: "yearly", label: "Yearly" }
  ];

  const getDatePresets = () => [
    {
      label: "Last 30 days",
      from: subDays(new Date(), 30),
      to: new Date()
    },
    {
      label: "Last 3 months",
      from: subMonths(new Date(), 3),
      to: new Date()
    },
    {
      label: "Last 6 months",
      from: subMonths(new Date(), 6),
      to: new Date()
    },
    {
      label: "Last year",
      from: subYears(new Date(), 1),
      to: new Date()
    },
    {
      label: "Last 2 years",
      from: subYears(new Date(), 2),
      to: new Date()
    }
  ];

  const calculateOverallStats = () => {
    if (sentimentData.length === 0) return null;

    const totalPositive = sentimentData.reduce((sum, item) => sum + item.positive_count, 0);
    const totalNegative = sentimentData.reduce((sum, item) => sum + item.negative_count, 0);
    const totalNeutral = sentimentData.reduce((sum, item) => sum + item.neutral_count, 0);
    const total = totalPositive + totalNegative + totalNeutral;

    const avgRating = sentimentData.reduce((sum, item) => sum + item.average_rating, 0) / sentimentData.length;
    const avgSentimentScore = sentimentData.reduce((sum, item) => sum + item.sentiment_score, 0) / sentimentData.length;

    return {
      totalPositive,
      totalNegative,
      totalNeutral,
      total,
      positivePercentage: total > 0 ? (totalPositive / total) * 100 : 0,
      negativePercentage: total > 0 ? (totalNegative / total) * 100 : 0,
      neutralPercentage: total > 0 ? (totalNeutral / total) * 100 : 0,
      avgRating,
      avgSentimentScore
    };
  };

  const stats = calculateOverallStats();

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading sentiment analysis...</p>
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
              <LocationSelector />
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
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
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Sentiment Analysis</h1>
                <p className="text-muted-foreground">
                  AI-powered sentiment insights from your customer reviews
                </p>
              </div>
              <Button onClick={handleGenerateSentiment}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Generate Analysis
              </Button>
            </div>

            {/* Controls */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Analysis Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Time Period</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getPeriodOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Range Presets</label>
                    <Select onValueChange={(value) => {
                      const preset = getDatePresets()[parseInt(value)];
                      setDateRange(preset);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDatePresets().map((preset, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Custom Date Range</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange.from && dateRange.to
                            ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
                            : "Pick a date range"
                          }
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => range && range.from && range.to && setDateRange({ from: range.from, to: range.to })}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Stats */}
            {stats && (
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Positive Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">{stats.totalPositive}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.positivePercentage.toFixed(1)}% of total
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Negative Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{stats.totalNegative}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.negativePercentage.toFixed(1)}% of total
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Neutral Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-muted-foreground">{stats.totalNeutral}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.neutralPercentage.toFixed(1)}% of total
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">
                      Sentiment: {stats.avgSentimentScore.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Detailed Analysis and Recommendations */}
            {stats && (
              <div className="grid gap-6">
                {/* Business Health Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Business Performance Analysis</CardTitle>
                    <CardDescription>Comprehensive assessment based on customer feedback data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Performance Indicators */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg bg-gradient-to-b from-primary/5 to-primary/10">
                        <div className="text-2xl font-bold text-primary mb-2">
                          {stats.avgRating.toFixed(1)}/5.0
                        </div>
                        <p className="text-sm text-muted-foreground">Average Rating</p>
                        <p className="text-xs mt-1 font-medium">
                          {stats.avgRating >= 4.5 ? "Excellent Performance" :
                           stats.avgRating >= 4.0 ? "Very Good Performance" :
                           stats.avgRating >= 3.5 ? "Good Performance" :
                           stats.avgRating >= 3.0 ? "Average Performance" : "Requires Immediate Attention"}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg bg-gradient-to-b from-success/5 to-success/10">
                        <div className="text-2xl font-bold text-success mb-2">
                          {stats.positivePercentage.toFixed(0)}%
                        </div>
                        <p className="text-sm text-muted-foreground">Positive Sentiment</p>
                        <p className="text-xs mt-1 font-medium">
                          {stats.positivePercentage >= 80 ? "Outstanding Customer Satisfaction" :
                           stats.positivePercentage >= 70 ? "Strong Customer Satisfaction" :
                           stats.positivePercentage >= 60 ? "Good Customer Satisfaction" :
                           stats.positivePercentage >= 50 ? "Fair Customer Satisfaction" : "Critical - Immediate Action Required"}
                        </p>
                      </div>
                      <div className="text-center p-4 border rounded-lg bg-gradient-to-b from-muted/20 to-muted/30">
                        <div className="text-2xl font-bold text-foreground mb-2">
                          {stats.total}
                        </div>
                        <p className="text-sm text-muted-foreground">Total Reviews Analyzed</p>
                        <p className="text-xs mt-1 font-medium">
                          {stats.total >= 100 ? "Statistically Significant" :
                           stats.total >= 50 ? "Good Sample Size" :
                           stats.total >= 20 ? "Moderate Sample" : "Limited Data - Gather More Reviews"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Strengths */}
                  <Card className="border-success/20">
                    <CardHeader>
                      <CardTitle className="text-success">Competitive Advantages</CardTitle>
                      <CardDescription>Key strengths driving positive customer feedback</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-success mb-3">Top Performing Areas:</h4>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            {Array.from(new Set(sentimentData.flatMap(d => d.top_positive_tags || []))).slice(0, 8).map((tag, i) => (
                              <Badge key={i} className="sentiment-positive justify-center py-1">{tag}</Badge>
                            ))}
                          </div>
                        </div>

                        {stats.positivePercentage >= 70 && (
                          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                            <h5 className="text-sm text-success font-semibold mb-2">Performance Validation</h5>
                            <p className="text-xs text-success/80">
                              Your {stats.positivePercentage.toFixed(0)}% positive sentiment score indicates strong customer satisfaction.
                              Maintain current service standards and consider scaling successful practices.
                            </p>
                          </div>
                        )}

                        <div className="border-t pt-4">
                          <h5 className="font-medium text-success mb-2">Strategic Recommendations:</h5>
                          <ul className="text-xs space-y-1 text-success/80">
                            <li>• Leverage positive feedback in marketing materials</li>
                            <li>• Train staff on successful service practices</li>
                            <li>• Document and standardize winning approaches</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Areas for Improvement */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-primary">Focus Areas</CardTitle>
                      <CardDescription>Priority areas for business improvement</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-destructive mb-2">Common Concerns:</h4>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {Array.from(new Set(sentimentData.flatMap(d => d.top_negative_tags || []))).slice(0, 6).map((tag, i) => (
                              <Badge key={i} className="sentiment-negative">{tag}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Critical Issues */}
                        {Array.from(new Set(sentimentData.flatMap(d => d.top_issues || []))).slice(0, 3).map((issue, i) => (
                          <div key={i} className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                            <p className="text-sm text-destructive">{issue}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Actionable Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-primary">🚀 Action Plan</CardTitle>
                    <CardDescription>AI-powered recommendations to boost your ratings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-medium text-primary mb-3">Immediate Actions:</h4>
                        <div className="space-y-3">
                          {Array.from(new Set(sentimentData.flatMap(d => d.top_suggestions || []))).slice(0, 3).map((suggestion, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">
                                {i + 1}
                              </div>
                              <p className="text-sm flex-1">{suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-primary mb-3">Strategic Focus:</h4>
                        <div className="space-y-3">
                          {stats.negativePercentage > 20 && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-sm text-red-800 dark:text-red-200 font-medium">📊 Address Negative Feedback</p>
                              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                {stats.negativePercentage.toFixed(0)}% negative reviews require immediate attention
                              </p>
                            </div>
                          )}

                          {stats.avgRating < 4.0 && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                              <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">⭐ Boost Overall Rating</p>
                              <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                                Target 4.0+ rating to improve visibility and trust
                              </p>
                            </div>
                          )}

                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">💬 Engage Proactively</p>
                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                              Respond to reviews to show you value customer feedback
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Sentiment Data */}
            {sentimentData.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sentiment data found</h3>
                  <p className="text-muted-foreground mb-6">
                    Generate sentiment analysis from your reviews to get started.
                  </p>
                  <Button onClick={handleGenerateSentiment}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Analysis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sentimentData.map((data) => (
                  <Card key={data.id}>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <div>
                          <CardTitle className="text-lg">
                            {format(new Date(data.analysis_date), 'MMM d, yyyy')}
                          </CardTitle>
                          <CardDescription>
                            {data.location_name} • {data.period_type} analysis
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{data.average_rating.toFixed(1)}</div>
                          <p className="text-sm text-muted-foreground">Avg Rating</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{data.positive_count}</div>
                          <p className="text-sm text-muted-foreground">Positive</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-600">{data.neutral_count}</div>
                          <p className="text-sm text-muted-foreground">Neutral</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{data.negative_count}</div>
                          <p className="text-sm text-muted-foreground">Negative</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {data.top_positive_tags && data.top_positive_tags.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-green-600 mb-2">Top Positive Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              {data.top_positive_tags.map((tag, index) => (
                                <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {data.top_negative_tags && data.top_negative_tags.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-red-600 mb-2">Top Negative Tags</h4>
                            <div className="flex flex-wrap gap-2">
                              {data.top_negative_tags.map((tag, index) => (
                                <span key={index} className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Issues and Suggestions Section */}
                      {((data.top_issues && data.top_issues.length > 0) || (data.top_suggestions && data.top_suggestions.length > 0)) && (
                        <div className="grid md:grid-cols-2 gap-6 mt-6">
                          {data.top_issues && data.top_issues.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-destructive mb-3 flex items-center">
                                <span className="w-2 h-2 bg-destructive rounded-full mr-2"></span>
                                Key Issues to Address
                              </h4>
                              <div className="space-y-2">
                                {data.top_issues.map((issue, index) => (
                                  <div key={index} className="text-sm bg-destructive/5 p-3 rounded-lg border-l-2 border-destructive/20">
                                    ⚠️ {issue}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {data.top_suggestions && data.top_suggestions.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-primary mb-3 flex items-center">
                                <span className="w-2 h-2 bg-primary rounded-full mr-2"></span>
                                Recommended Actions
                              </h4>
                              <div className="space-y-2">
                                {data.top_suggestions.map((suggestion, index) => (
                                  <div key={index} className="text-sm bg-primary/5 p-3 rounded-lg border-l-2 border-primary/20">
                                    💡 {suggestion}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show message if no actionable insights */}
                      {(!data.top_issues || data.top_issues.length === 0) && (!data.top_suggestions || data.top_suggestions.length === 0) && (
                        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                          <p className="text-muted-foreground">No specific issues or suggestions identified for this period. Consider running AI analysis on more reviews.</p>
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

export default Sentiment;