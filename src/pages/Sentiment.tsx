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
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { MapPin, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, BarChart3, Download, PieChart as PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from "date-fns";
import { useAnalysisProgress } from "@/hooks/useAnalysisProgress";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>({ from: new Date('1990-01-01'), to: new Date() });
  const [selectedPreset, setSelectedPreset] = useState<string>("0"); // Default to "All Time"
  const { selectedLocation: ctxSelectedLocation } = useLocationContext();
  
  // Analysis progress tracking
  const userKey = user?.email || 'anonymous';
  const locKey = (ctxSelectedLocation as any)?.google_place_id || 'default';
  const {
    isAnalyzing,
    progress,
    total,
    completed,
    startProgress,
    updateProgress,
    finishProgress,
    resetProgress
  } = useAnalysisProgress(`sentiment_${userKey}_${locKey}`);

  // Get date range to use - custom if set, otherwise default to all time
  const getDateRange = () => {
    if (dateRange) return dateRange;
    // Default to all time
    return { from: new Date('1990-01-01'), to: new Date() };
  };

  // Chart data preparation
  const getSentimentTrendData = () => {
    const currentDateRange = getDateRange();
    // Filter sentiment data by the selected date range
    const filteredData = sentimentData.filter(data => {
      if (!data.analysis_date) return false;
      const dataDate = new Date(data.analysis_date);
      // Check if date is valid
      if (isNaN(dataDate.getTime())) return false;
      return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
    });

    // Sort by date to ensure chronological order
    const sortedData = filteredData.sort((a, b) => {
      const dateA = new Date(a.analysis_date);
      const dateB = new Date(b.analysis_date);
      return dateA.getTime() - dateB.getTime();
    });

    return sortedData.map(data => {
      const dataDate = new Date(data.analysis_date);
      return {
        date: format(dataDate, 'MMM d, yyyy'),
        positive: data.positive_count || 0,
        negative: data.negative_count || 0,
        neutral: data.neutral_count || 0,
        rating: data.average_rating || 0,
        sentiment: data.sentiment_score || 0
      };
    });
  };

  const getSentimentPieData = () => {
    if (!stats) return [];
    return [
      { name: 'Positive', value: stats.totalPositive, color: '#22c55e' },
      { name: 'Negative', value: stats.totalNegative, color: '#ef4444' },
      { name: 'Neutral', value: stats.totalNeutral, color: '#6b7280' }
    ];
  };

  const getTopTagsData = () => {
    const currentDateRange = getDateRange();
    // Filter sentiment data by the selected date range
    const filteredData = sentimentData.filter(data => {
      const dataDate = new Date(data.analysis_date);
      return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
    });

    // Collect all positive and negative tags from filtered data
    const allPositiveTags: string[] = [];
    const allNegativeTags: string[] = [];
    
    filteredData.forEach(data => {
      if (data.top_positive_tags) {
        allPositiveTags.push(...data.top_positive_tags);
      }
      if (data.top_negative_tags) {
        allNegativeTags.push(...data.top_negative_tags);
      }
    });

    // Count occurrences of each tag
    const positiveTagCounts: { [key: string]: number } = {};
    const negativeTagCounts: { [key: string]: number } = {};

    allPositiveTags.forEach(tag => {
      positiveTagCounts[tag] = (positiveTagCounts[tag] || 0) + 1;
    });

    allNegativeTags.forEach(tag => {
      negativeTagCounts[tag] = (negativeTagCounts[tag] || 0) + 1;
    });

    // Convert to array and sort by count
    const positiveTags = Object.entries(positiveTagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const negativeTags = Object.entries(negativeTagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      positive: positiveTags,
      negative: negativeTags
    };
  };

  // Export functionality
  const exportToCSV = () => {
    if (sentimentData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please generate sentiment analysis first before exporting.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Analysis Date",
      "Period Type",
      "Positive Count",
      "Negative Count", 
      "Neutral Count",
      "Average Rating",
      "Sentiment Score",
      "Top Positive Tags",
      "Top Negative Tags",
      "Top Issues",
      "Top Suggestions"
    ];

    const csvContent = [
      headers.join(","),
      ...sentimentData.map(data => [
        data.analysis_date,
        data.period_type,
        data.positive_count,
        data.negative_count,
        data.neutral_count,
        data.average_rating,
        data.sentiment_score,
        `"${(data.top_positive_tags || []).join('; ')}"`,
        `"${(data.top_negative_tags || []).join('; ')}"`,
        `"${(data.top_issues || []).join('; ')}"`,
        `"${(data.top_suggestions || []).join('; ')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentiment-analysis-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Sentiment analysis data has been exported to CSV file.",
    });
  };

  // Initialize default date range on component mount
  useEffect(() => {
    if (!dateRange && selectedPreset !== "custom") {
      const preset = getDatePresets()[parseInt(selectedPreset)];
      setDateRange(preset);
    }
  }, [selectedPreset]);

  useEffect(() => {
    if (user) {
      fetchSentimentData();
    }
  }, [user, ctxSelectedLocation?.google_place_id]);


  const fetchSentimentData = async () => {
    if (!user) return;

    try {
      // Only show loading spinner on initial load (when no data exists)
      if (sentimentData.length === 0) {
        setLoading(true);
      }

      // Check if demo user and use the same generated demo reviews as Reviews page
      if (user.email === 'demolip29@gmail.com') {
        const { getDemoReviewsForLocation, mockLocations } = await import('@/utils/mockData');
        let filteredReviews: any[] = [];
        const demoPlaceId: string | undefined = (ctxSelectedLocation as any)?.google_place_id;
        const match = demoPlaceId ? mockLocations.find(l => l.google_place_id === demoPlaceId) : undefined;
        const demoLocationId = match?.id || mockLocations[0]?.id;
        if (demoLocationId) {
          filteredReviews = getDemoReviewsForLocation(demoLocationId);
        }

        // Filter out reviews without sentiment
        filteredReviews = filteredReviews.filter((r) => r.ai_sentiment !== null);

        console.log('Demo reviews found:', filteredReviews.length);
        const processedData = processReviewsIntoSentimentData(filteredReviews);
        console.log('Demo processed sentiment data:', processedData);
        setSentimentData(processedData);
        return;
      }

      // Get ALL reviews (both analyzed and unanalyzed)
      let query = supabase
        .from('saved_reviews')
        .select('*')
        .limit(100000); // Allow fetching up to 100k reviews (Supabase default is 1000)

      const locationId = (ctxSelectedLocation as any)?.id || (ctxSelectedLocation as any)?.location_id || (ctxSelectedLocation as any)?.google_place_id?.split('/').pop();
      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data: reviews, error } = await query;

      if (!error && reviews) {
        console.log('Total reviews found:', reviews.length);
        
        // For reviews without AI sentiment, use rating-based sentiment
        const reviewsWithSentiment = reviews.map(review => {
          if (!review.ai_sentiment) {
            // Rating-based sentiment: 5 = positive, 4 = positive, 3 = neutral, 1-2 = negative
            let sentiment = 'neutral';
            if (review.rating >= 4) sentiment = 'positive';
            else if (review.rating <= 2) sentiment = 'negative';
            
            return {
              ...review,
              ai_sentiment: sentiment,
              ai_tags: review.ai_tags || [],
              ai_issues: review.ai_issues || [],
              ai_suggestions: review.ai_suggestions || []
            };
          }
          return review;
        });
        
        console.log('Reviews with sentiment (AI + rating-based):', reviewsWithSentiment.length);
        console.log('Date range for processing:', {
          from: getDateRange().from,
          to: getDateRange().to
        });
        
        // Process reviews into sentiment data by period
        const processedData = processReviewsIntoSentimentData(reviewsWithSentiment);
        console.log('Processed sentiment data:', processedData);
        setSentimentData(processedData);
      } else {
        console.log('No reviews found or error:', error);
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
    // Filter reviews by the selected date range
    const currentDateRange = getDateRange();
    const filteredReviews = reviews.filter(review => {
      const reviewDate = new Date(review.review_date);
      return reviewDate >= currentDateRange.from && reviewDate <= currentDateRange.to;
    });

    console.log('Processing reviews:', {
      totalReviews: reviews.length,
      filteredReviews: filteredReviews.length,
      dateRange: currentDateRange
    });

    // Group by month for better visualization
    const groupedData: { [key: string]: any } = {};

    filteredReviews.forEach(review => {
      const reviewDate = new Date(review.review_date);
      const key = format(reviewDate, 'yyyy-MM'); // Group by month

      if (!groupedData[key]) {
        groupedData[key] = {
          id: key,
          analysis_date: key,
          period_type: 'monthly',
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

      // Collect issues and suggestions
      if (review.ai_issues && Array.isArray(review.ai_issues)) {
        groupedData[key].all_issues.push(...review.ai_issues);
      }
      if (review.ai_suggestions && Array.isArray(review.ai_suggestions)) {
        groupedData[key].all_suggestions.push(...review.ai_suggestions);
      }
    });

    // Convert to final format
    const result = Object.values(groupedData).map((data: any) => ({
      ...data,
      average_rating: data.ratings.length > 0 ? data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length : 0,
      sentiment_score: (data.positive_count + data.negative_count + data.neutral_count) > 0 
        ? (data.positive_count / (data.positive_count + data.negative_count + data.neutral_count)) * 100 
        : 0,
      top_positive_tags: getTopTags(data.positive_tags),
      top_negative_tags: getTopTags(data.negative_tags),
      top_issues: getTopItems(data.all_issues),
      top_suggestions: getTopItems(data.all_suggestions)
    }));

    console.log('Processed sentiment data:', result);
    return result;
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
    if (!user || isAnalyzing) return;

    try {
      startProgress();

      // Get the location ID
      const locationId = (ctxSelectedLocation as any)?.id || (ctxSelectedLocation as any)?.location_id || (ctxSelectedLocation as any)?.google_place_id?.split('/').pop();
      
      if (!locationId) {
        toast({
          title: "Error",
          description: "Please select a location first",
          variant: "destructive",
        });
        finishProgress();
        return;
      }

      // Get reviews that haven't been analyzed yet
      const { data: unanalyzedReviews, error: fetchError } = await supabase
        .from('saved_reviews')
        .select('*')
        .eq('location_id', locationId)
        .is('ai_analyzed_at', null)
        .limit(100000); // Allow fetching up to 100k reviews (Supabase default is 1000)

      if (fetchError) throw fetchError;

      if (!unanalyzedReviews || unanalyzedReviews.length === 0) {
        toast({
          title: "Info",
          description: "All reviews are already analyzed",
        });
        finishProgress();
        return;
      }

      updateProgress(0, unanalyzedReviews.length);

      toast({
        title: "Processing",
        description: `Analyzing ${unanalyzedReviews.length} reviews...`,
      });

      // Process reviews in batches of 10
      const batchSize = 10;
      let processedCount = 0;

      for (let i = 0; i < unanalyzedReviews.length; i += batchSize) {
        const batch = unanalyzedReviews.slice(i, i + batchSize);

        // Call the AI analysis edge function
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-review-analysis', {
          body: { reviews: batch }
        });

        if (!analysisError && analysisData?.reviews) {
          // Update database with AI analysis
          for (const analyzedReview of analysisData.reviews) {
            await supabase
              .from('saved_reviews')
              .update({
                ai_sentiment: analyzedReview.ai_sentiment,
                ai_tags: analyzedReview.ai_tags,
                ai_issues: analyzedReview.ai_issues,
                ai_suggestions: analyzedReview.ai_suggestions,
                ai_analyzed_at: new Date().toISOString(),
              })
              .eq('google_review_id', analyzedReview.google_review_id);
          }

          processedCount += batch.length;
          updateProgress(processedCount, unanalyzedReviews.length);
        }
      }

      toast({
        title: "Success",
        description: `Successfully analyzed ${processedCount} reviews`,
      });

      finishProgress();
      
      // Refresh the sentiment data
      fetchSentimentData();
    } catch (error) {
      console.error('Error generating sentiment analysis:', error);
      toast({
        title: "Error",
        description: "Failed to generate sentiment analysis",
        variant: "destructive",
      });
      finishProgress();
    }
  };


  const getDatePresets = () => [
    {
      label: "All Time",
      from: new Date('1990-01-01'), // Far back enough to capture all data
      to: new Date()
    },
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

    const currentDateRange = getDateRange();
    // Filter sentiment data by the selected date range
    const filteredData = sentimentData.filter(data => {
      const dataDate = new Date(data.analysis_date);
      return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
    });

    if (filteredData.length === 0) return null;

    const totalPositive = filteredData.reduce((sum, item) => sum + item.positive_count, 0);
    const totalNegative = filteredData.reduce((sum, item) => sum + item.negative_count, 0);
    const totalNeutral = filteredData.reduce((sum, item) => sum + item.neutral_count, 0);
    const total = totalPositive + totalNegative + totalNeutral;

    const avgRating = filteredData.reduce((sum, item) => sum + item.average_rating, 0) / filteredData.length;
    const avgSentimentScore = filteredData.reduce((sum, item) => sum + item.sentiment_score, 0) / filteredData.length;

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
            <div className="flex items-center space-x-4 ml-auto"></div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Sentiment Analysis</h1>
                <p className="text-muted-foreground">
                  AI-powered sentiment insights from your customer reviews
                </p>
              </div>
              <div className="flex gap-2">
                {sentimentData.length > 0 && (
                  <Button onClick={exportToCSV} variant="outline" disabled={isAnalyzing}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                )}
                <Button onClick={handleGenerateSentiment} disabled={isAnalyzing}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {isAnalyzing ? 'Analyzing...' : 'Generate Analysis'}
                </Button>
              </div>
            </div>

            {/* Analysis Progress Bar */}
            {isAnalyzing && (
              <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        Analyzing reviews with AI...
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-700 dark:text-blue-300">
                          {completed} / {total} reviews
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={finishProgress}
                          className="h-6 text-xs text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${progress}%` }}
                      >
                        {progress > 10 && (
                          <span className="text-xs text-white font-medium">
                            {Math.round(progress)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Please wait while we analyze your reviews. This may take a few moments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Controls */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Analysis Parameters</CardTitle>
                <CardDescription>
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-2">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium mt-0.5 flex-shrink-0">
                        i
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">How to Use Date Range Filters:</p>
                        <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
                          <li>• <strong>Quick Select:</strong> Choose from preset ranges like "Last 30 days", "Last 6 months", etc.</li>
                          <li>• <strong>Custom Range:</strong> Click the calendar button, then click start date, then end date</li>
                          <li>• <strong>Default:</strong> Shows last 3 months of data when you first load the page</li>
                          <li>• <strong>Result:</strong> Sentiment analysis grouped by month for your selected time period</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Range Presets</label>
                    <Select 
                      value={selectedPreset}
                      onValueChange={(value) => {
                        setSelectedPreset(value);
                        if (value === "custom") {
                          // Don't set dateRange yet, let user select custom dates
                          setDateRange(null);
                        } else {
                          const preset = getDatePresets()[parseInt(value)];
                          setDateRange(preset);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select preset" />
                      </SelectTrigger>
                      <SelectContent>
                        {getDatePresets().map((preset, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {preset.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedPreset === "custom" && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Custom Date Range</label>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                            <input
                              type="date"
                              className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                              style={{
                                colorScheme: 'dark'
                              }}
                              value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  const startDate = new Date(e.target.value);
                                  setDateRange(prev => ({ 
                                    from: startDate, 
                                    to: prev?.to || undefined 
                                  }));
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                            <input
                              type="date"
                              className="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                              style={{
                                colorScheme: 'dark'
                              }}
                              value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  const endDate = new Date(e.target.value);
                                  setDateRange(prev => ({ 
                                    from: prev?.from || undefined, 
                                    to: endDate 
                                  }));
                                }
                              }}
                            />
                          </div>
                        </div>
                        {dateRange?.from && dateRange?.to && (
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {format(dateRange.from, 'MMM d, yyyy')} - {format(dateRange.to, 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Overall Stats */}
            {stats && (
              <div className="grid md:grid-cols-4 gap-6 mb-8">
                <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Positive Reviews</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.totalPositive}</div>
                    <p className="text-xs text-green-600/70">
                      {stats.positivePercentage.toFixed(1)}% of total
                    </p>
                    <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2 mt-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${stats.positivePercentage}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Negative Reviews</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.totalNegative}</div>
                    <p className="text-xs text-red-600/70">
                      {stats.negativePercentage.toFixed(1)}% of total
                    </p>
                    <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-2 mt-2">
                      <div 
                        className="bg-red-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${stats.negativePercentage}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Neutral Reviews</CardTitle>
                    <Minus className="h-4 w-4 text-gray-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">{stats.totalNeutral}</div>
                    <p className="text-xs text-gray-600/70">
                      {stats.neutralPercentage.toFixed(1)}% of total
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gray-600 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${stats.neutralPercentage}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Average Rating</CardTitle>
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.avgRating.toFixed(1)}</div>
                    <p className="text-xs text-blue-600/70">
                      Sentiment: {stats.avgSentimentScore.toFixed(2)}
                    </p>
                    <div className="flex items-center mt-2">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-3 h-3 rounded-full mr-1 ${
                            i < Math.floor(stats.avgRating) 
                              ? 'bg-yellow-400' 
                              : i < stats.avgRating 
                                ? 'bg-yellow-200' 
                                : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Simple Visual Charts */}
            {sentimentData.length > 0 && (
              <div className="grid gap-6 mb-8">
                {/* Sentiment Overview - Simple and Clear */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Sentiment Overview
                    </CardTitle>
                    <CardDescription>Clear breakdown of customer sentiment</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Positive Sentiment */}
                      <div className="text-center p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-4xl font-bold text-green-600 mb-2">
                          {stats?.totalPositive || 0}
                        </div>
                        <div className="text-lg font-medium text-green-700 dark:text-green-300 mb-1">
                          Positive Reviews
                        </div>
                        <div className="text-sm text-green-600/70">
                          {stats?.positivePercentage.toFixed(1) || 0}% of total
                        </div>
                        <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-3 mt-3">
                          <div 
                            className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                            style={{ width: `${stats?.positivePercentage || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Neutral Sentiment */}
                      <div className="text-center p-6 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-4xl font-bold text-gray-600 mb-2">
                          {stats?.totalNeutral || 0}
                        </div>
                        <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Neutral Reviews
                        </div>
                        <div className="text-sm text-gray-600/70">
                          {stats?.neutralPercentage.toFixed(1) || 0}% of total
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-3">
                          <div 
                            className="bg-gray-600 h-3 rounded-full transition-all duration-500" 
                            style={{ width: `${stats?.neutralPercentage || 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Negative Sentiment */}
                      <div className="text-center p-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <div className="text-4xl font-bold text-red-600 mb-2">
                          {stats?.totalNegative || 0}
                        </div>
                        <div className="text-lg font-medium text-red-700 dark:text-red-300 mb-1">
                          Negative Reviews
                        </div>
                        <div className="text-sm text-red-600/70">
                          {stats?.negativePercentage.toFixed(1) || 0}% of total
                        </div>
                        <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-3 mt-3">
                          <div 
                            className="bg-red-600 h-3 rounded-full transition-all duration-500" 
                            style={{ width: `${stats?.negativePercentage || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Simple Bar Chart for Sentiment Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Sentiment Distribution
                    </CardTitle>
                    <CardDescription>Visual breakdown of sentiment types</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={[
                        { name: 'Positive', value: stats?.totalPositive || 0, color: '#22c55e' },
                        { name: 'Neutral', value: stats?.totalNeutral || 0, color: '#6b7280' },
                        { name: 'Negative', value: stats?.totalNegative || 0, color: '#ef4444' }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => [value, 'Reviews']}
                          labelFormatter={(label) => `${label} Sentiment`}
                        />
                        <Bar dataKey="value" fill="#8884d8">
                          {[
                            { name: 'Positive', value: stats?.totalPositive || 0, color: '#22c55e' },
                            { name: 'Neutral', value: stats?.totalNeutral || 0, color: '#6b7280' },
                            { name: 'Negative', value: stats?.totalNegative || 0, color: '#ef4444' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Rating Trend - Simple Line Chart */}
                {getSentimentTrendData().length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Average Rating Over Time
                      </CardTitle>
                      <CardDescription>How your ratings have changed</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={getSentimentTrendData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            interval={0}
                          />
                          <YAxis domain={[0, 5]} />
                          <Tooltip 
                            formatter={(value: any) => [value.toFixed(1), 'Rating']}
                            labelFormatter={(label) => `Date: ${label}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="rating" 
                            stroke="#3b82f6" 
                            strokeWidth={3} 
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                            name="Average Rating" 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top Tags - Simple List Format */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-600 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        What Customers Love
                      </CardTitle>
                      <CardDescription>Most mentioned positive aspects</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getTopTagsData().positive.length > 0 ? (
                          getTopTagsData().positive.map((tag, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                              <span className="font-medium text-green-800 dark:text-green-200">{tag.tag}</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {tag.count} mentions
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-4">No positive tags found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-red-600 flex items-center gap-2">
                        <TrendingDown className="w-5 h-5" />
                        Areas to Improve
                      </CardTitle>
                      <CardDescription>Most mentioned concerns</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getTopTagsData().negative.length > 0 ? (
                          getTopTagsData().negative.map((tag, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                              <span className="font-medium text-red-800 dark:text-red-200">{tag.tag}</span>
                              <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {tag.count} mentions
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-4">No negative tags found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
                            {Array.from(new Set(
                              sentimentData
                                .filter(data => {
                                  const currentDateRange = getDateRange();
                                  const dataDate = new Date(data.analysis_date);
                                  return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                                })
                                .flatMap(d => d.top_positive_tags || [])
                            )).slice(0, 8).map((tag, i) => (
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
                            {Array.from(new Set(
                              sentimentData
                                .filter(data => {
                                  const currentDateRange = getDateRange();
                                  const dataDate = new Date(data.analysis_date);
                                  return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                                })
                                .flatMap(d => d.top_negative_tags || [])
                            )).slice(0, 6).map((tag, i) => (
                              <Badge key={i} className="sentiment-negative">{tag}</Badge>
                            ))}
                          </div>
                        </div>

                        {/* Critical Issues */}
                        {Array.from(new Set(
                          sentimentData
                            .filter(data => {
                              const currentDateRange = getDateRange();
                              const dataDate = new Date(data.analysis_date);
                              return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                            })
                            .flatMap(d => d.top_issues || [])
                        )).slice(0, 3).map((issue, i) => (
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
                          {Array.from(new Set(
                            sentimentData
                              .filter(data => {
                                const currentDateRange = getDateRange();
                                const dataDate = new Date(data.analysis_date);
                                return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                              })
                              .flatMap(d => d.top_suggestions || [])
                          )).slice(0, 3).map((suggestion, i) => (
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