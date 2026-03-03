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
import { PageOrbs, fancyCardClass } from "@/components/PageLayout";
import LocationSelector from "@/components/LocationSelector";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { MapPin, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, BarChart3, Download, PieChart as PieChartIcon, HelpCircle, History } from "lucide-react";
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
  AreaChart,
  Area,
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
  const [sentimentPage, setSentimentPage] = useState(1);
  const sentimentPageSize = 5; // Show 5 periods per page
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
      // Filter out invalid ratings (outliers)
      if (!data.average_rating || data.average_rating < 1 || data.average_rating > 5) return false;
      return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
    });

    // Sort by date to ensure chronological order
    const sortedData = filteredData.sort((a, b) => {
      const dateA = new Date(a.analysis_date);
      const dateB = new Date(b.analysis_date);
      return dateA.getTime() - dateB.getTime();
    });

    // If too many data points (>100), aggregate by week
    let processedData = sortedData;
    if (sortedData.length > 100) {
      const weekMap = new Map<string, { sum: number; count: number; date: Date }>();
      sortedData.forEach(data => {
        const dataDate = new Date(data.analysis_date);
        // Get week key (year-week)
        const weekKey = `${dataDate.getFullYear()}-W${Math.floor(dataDate.getDate() / 7)}`;
        if (!weekMap.has(weekKey)) {
          weekMap.set(weekKey, { sum: 0, count: 0, date: dataDate });
        }
        const week = weekMap.get(weekKey)!;
        week.sum += data.average_rating || 0;
        week.count += 1;
      });
      // Convert back to array with averages
      processedData = Array.from(weekMap.values()).map(week => ({
        analysis_date: week.date.toISOString(),
        average_rating: week.sum / week.count,
        total_positive: 0,
        total_negative: 0,
        total_neutral: 0,
        total_reviews: week.count
      }));
    }

    return processedData.map(data => {
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

      // Get ALL reviews (both analyzed and unanalyzed) - FETCH IN CHUNKS
      const locationId = (ctxSelectedLocation as any)?.id || (ctxSelectedLocation as any)?.location_id || (ctxSelectedLocation as any)?.google_place_id?.split('/').pop();
      
      let allReviews: any[] = [];
      let hasMore = true;
      let offset = 0;
      const chunkSize = 1000;

      console.log('📦 [Sentiment] FETCHING ALL REVIEWS IN CHUNKS...');

      while (hasMore) {
        let query = supabase
          .from('saved_reviews')
          .select('*')
          .range(offset, offset + chunkSize - 1);

        if (locationId) {
          query = query.eq('location_id', locationId);
        }

        const { data: chunk, error: chunkError } = await query;

        if (chunkError) {
          console.error('❌ Error fetching chunk:', chunkError);
          break;
        }

        const chunkLength = chunk?.length || 0;
        console.log(`📦 [Sentiment] Loaded chunk: ${chunkLength} reviews (offset: ${offset})`);
        
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

      console.log(`✅ [Sentiment] TOTAL REVIEWS LOADED: ${reviews.length}`);

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

      // Get reviews that haven't been analyzed yet - FETCH ALL IN CHUNKS
      let allUnanalyzedReviews: any[] = [];
      let hasMore = true;
      let offset = 0;
      const chunkSize = 1000;

      console.log('🔍 [Sentiment] FETCHING ALL UNANALYZED REVIEWS IN CHUNKS...');

      // Fetch in chunks of 1000 until we get all reviews
      while (hasMore) {
        const { data: chunk, error: fetchError } = await supabase
          .from('saved_reviews')
          .select('*')
          .eq('location_id', locationId)
          .is('ai_analyzed_at', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + chunkSize - 1);

        if (fetchError) {
          console.error('❌ Error fetching chunk:', fetchError);
          throw fetchError;
        }

        const chunkLength = chunk?.length || 0;
        console.log(`📦 [Sentiment] Fetched chunk: ${chunkLength} reviews (offset: ${offset})`);
        
        if (chunk && chunk.length > 0) {
          allUnanalyzedReviews.push(...chunk);
        }

        // If we got fewer than chunkSize results, we've fetched all
        if (chunkLength < chunkSize) {
          hasMore = false;
        } else {
          offset += chunkSize;
        }
      }

      const unanalyzedReviews = allUnanalyzedReviews;

      console.log('✅ [Sentiment] TOTAL UNANALYZED REVIEWS FETCHED:', unanalyzedReviews.length);

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading sentiment analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <AppSidebar />
        <SidebarInset className="relative overflow-x-hidden">
          <PageOrbs />
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-3 sm:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-4">
              <LocationSelector />
            </div>
            <div className="flex items-center space-x-4 ml-auto"></div>
          </header>

          <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
            {/* Toolbar: title + filters + actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Sentiment</h1>
                <p className="text-sm text-muted-foreground mt-0.5">AI insights from your reviews</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={selectedPreset}
                  onValueChange={(value) => {
                    setSelectedPreset(value);
                    if (value === "custom") setDateRange(null);
                    else setDateRange(getDatePresets()[parseInt(value)]);
                  }}
                >
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDatePresets().map((preset, index) => (
                      <SelectItem key={index} value={index.toString()}>{preset.label}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {selectedPreset === "custom" && (
                  <>
                    <input
                      type="date"
                      className="h-9 px-2.5 text-sm border border-input rounded-md bg-background"
                      style={{ colorScheme: 'dark' }}
                      value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                      onChange={(e) => e.target.value && setDateRange(prev => ({ from: new Date(e.target.value), to: prev?.to || undefined }))}
                    />
                    <input
                      type="date"
                      className="h-9 px-2.5 text-sm border border-input rounded-md bg-background"
                      style={{ colorScheme: 'dark' }}
                      value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                      onChange={(e) => e.target.value && setDateRange(prev => ({ from: prev?.from || undefined, to: new Date(e.target.value) }))}
                    />
                  </>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="end">
                    <p className="font-medium text-sm mb-1">Date range</p>
                    <p className="text-xs text-muted-foreground">Choose a preset or custom dates. Results filter by this period.</p>
                  </PopoverContent>
                </Popover>
                <div className="h-6 w-px bg-border shrink-0 hidden sm:block" />
                {sentimentData.length > 0 && (
                  <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isAnalyzing} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                )}
                <Button size="sm" onClick={handleGenerateSentiment} disabled={isAnalyzing} className="gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {isAnalyzing ? 'Analyzing…' : 'Generate'}
                </Button>
              </div>
            </div>

            {isAnalyzing && (
              <div className="mb-6 rounded-xl border bg-primary/5 px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Analyzing reviews</span>
                    <span className="text-muted-foreground">{completed} / {total}</span>
                  </div>
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={finishProgress}>Clear</Button>
              </div>
            )}

            {sentimentData.length === 0 && !stats && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <BarChart3 className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-1">No sentiment data yet</h2>
                <p className="text-muted-foreground text-sm max-w-sm mb-6">Run an analysis on your reviews to see sentiment breakdown, trends, and recommendations.</p>
                <Button onClick={handleGenerateSentiment} disabled={isAnalyzing} size="lg" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Generate analysis
                </Button>
              </div>
            )}

            {stats && (
              <>
            {/* Metrics bar – single row */}
            <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-5 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-600">{stats.totalPositive}</span>
                  <span className="text-xs text-muted-foreground">positive</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-500">{stats.totalNegative}</span>
                  <span className="text-xs text-muted-foreground">negative</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-zinc-500">{stats.totalNeutral}</span>
                  <span className="text-xs text-muted-foreground">neutral</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">avg rating</span>
                </div>
              </div>
            </div>

            {/* Charts – 2 col */}
            {sentimentData.length > 0 && stats && (
              <div className="grid lg:grid-cols-2 gap-6 mb-8">
                <Card className={fancyCardClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Sentiment distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
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

                {getSentimentTrendData().length > 0 && (
                  <Card className={fancyCardClass}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Rating over time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={getSentimentTrendData()}>
                          <defs>
                            <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                          <XAxis 
                            dataKey="date" 
                            angle={-35}
                            textAnchor="end"
                            height={90}
                            interval="preserveStartEnd"
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <YAxis 
                            domain={[1, 5]} 
                            ticks={[1, 2, 3, 4, 5]}
                            tick={{ fontSize: 12 }}
                            stroke="#9ca3af"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#1f2937', 
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              padding: '12px'
                            }}
                            formatter={(value: any) => [
                              <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                {value.toFixed(2)} ⭐
                              </span>, 
                              'Average Rating'
                            ]}
                            labelFormatter={(label) => <span style={{ color: '#9ca3af' }}>📅 {label}</span>}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="rating" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fill="url(#ratingGradient)"
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 5, fillOpacity: 1 }}
                            activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                            name="Rating" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Feedback themes – one card, two cols */}
            <Card className={`${fancyCardClass} mb-8`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">What customers say</CardTitle>
                <CardDescription className="text-xs">Most mentioned themes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 mb-2">Positive</p>
                    <div className="space-y-1.5">
                      {getTopTagsData().positive.length > 0 ? (
                        getTopTagsData().positive.map((tag, index) => (
                          <div key={index} className="flex items-center justify-between py-1.5 text-sm">
                            <span className="text-foreground">{tag.tag}</span>
                            <span className="text-muted-foreground text-xs">{tag.count}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-xs py-2">None</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-2">To improve</p>
                    <div className="space-y-1.5">
                      {getTopTagsData().negative.length > 0 ? (
                        getTopTagsData().negative.map((tag, index) => (
                          <div key={index} className="flex items-center justify-between py-1.5 text-sm">
                            <span className="text-foreground">{tag.tag}</span>
                            <span className="text-muted-foreground text-xs">{tag.count}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-xs py-2">None</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance + recommendations */}
            <Card className={`${fancyCardClass} mb-8`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Performance & recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center py-3 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold">{stats.avgRating.toFixed(1)}</div>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div className="text-center py-3 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold text-emerald-600">{stats.positivePercentage.toFixed(0)}%</div>
                    <p className="text-xs text-muted-foreground">Positive</p>
                  </div>
                  <div className="text-center py-3 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-emerald-600 mb-2">Strengths</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(
                        sentimentData
                          .filter(data => {
                            const currentDateRange = getDateRange();
                            const dataDate = new Date(data.analysis_date);
                            return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                          })
                          .flatMap(d => d.top_positive_tags || [])
                      )).slice(0, 8).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-500 mb-2">Focus areas</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {Array.from(new Set(
                        sentimentData
                          .filter(data => {
                            const currentDateRange = getDateRange();
                            const dataDate = new Date(data.analysis_date);
                            return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                          })
                          .flatMap(d => d.top_negative_tags || [])
                      )).slice(0, 6).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">{tag}</Badge>
                      ))}
                    </div>
                    {Array.from(new Set(
                      sentimentData
                        .filter(data => {
                          const currentDateRange = getDateRange();
                          const dataDate = new Date(data.analysis_date);
                          return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                        })
                        .flatMap(d => d.top_issues || [])
                    )).slice(0, 3).map((issue, i) => (
                      <p key={i} className="text-xs text-muted-foreground border-l-2 border-red-200 pl-2 py-0.5">{issue}</p>
                    ))}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-xs font-medium mb-2">Action plan</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {Array.from(new Set(
                        sentimentData
                          .filter(data => {
                            const currentDateRange = getDateRange();
                            const dataDate = new Date(data.analysis_date);
                            return dataDate >= currentDateRange.from && dataDate <= currentDateRange.to;
                          })
                          .flatMap(d => d.top_suggestions || [])
                      )).slice(0, 3).map((suggestion, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      {stats.negativePercentage > 20 && (
                        <p>Address negative feedback ({stats.negativePercentage.toFixed(0)}% negative).</p>
                      )}
                      {stats.avgRating < 4.0 && (
                        <p>Aim for 4.0+ rating to improve visibility.</p>
                      )}
                      <p>Respond to reviews to show you value feedback.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Past analyses */}
            <div>
              <p className="text-sm font-medium mb-3">Past analyses</p>
            {sentimentData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No analyses yet. Generate one above.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  {Math.min((sentimentPage - 1) * sentimentPageSize + 1, sentimentData.length)}–{Math.min(sentimentPage * sentimentPageSize, sentimentData.length)} of {sentimentData.length}
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  {sentimentData
                    .slice((sentimentPage - 1) * sentimentPageSize, sentimentPage * sentimentPageSize)
                    .map((data) => (
                      <Card key={data.id} className={fancyCardClass}>
                        <CardHeader className="py-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle className="text-sm font-medium">
                                {format(new Date(data.analysis_date), 'MMM d, yyyy')}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {data.location_name} · {data.period_type}
                              </CardDescription>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="font-semibold">{data.average_rating.toFixed(1)}</span>
                              <span className="text-emerald-600">{data.positive_count} +</span>
                              <span className="text-zinc-500">{data.neutral_count} =</span>
                              <span className="text-red-500">{data.negative_count} −</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid md:grid-cols-2 gap-4">
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

                          {(!data.top_issues || data.top_issues.length === 0) && (!data.top_suggestions || data.top_suggestions.length === 0) && (
                            <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                              <p className="text-muted-foreground">No specific issues or suggestions identified for this period.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {sentimentData.length > sentimentPageSize && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Page {sentimentPage} of {Math.ceil(sentimentData.length / sentimentPageSize)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSentimentPage(p => Math.max(1, p - 1))}
                        disabled={sentimentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSentimentPage(p => Math.min(Math.ceil(sentimentData.length / sentimentPageSize), p + 1))}
                        disabled={sentimentPage >= Math.ceil(sentimentData.length / sentimentPageSize)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>
            </>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Sentiment;