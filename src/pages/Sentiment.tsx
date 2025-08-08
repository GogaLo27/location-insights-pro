import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
      fetchSentimentData();
    }
  }, [user, selectedLocation, selectedPeriod, dateRange]);

  const fetchLocations = async () => {
    try {
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
    try {
      setLoading(true);
      
      // Use edge function to get sentiment data
      const { data, error } = await supabase.functions.invoke('ai-review-analysis', {
        body: { 
          action: 'get_sentiment_analysis',
          location_id: selectedLocation !== "all" ? selectedLocation : undefined,
          period_type: selectedPeriod,
          start_date: format(dateRange.from, 'yyyy-MM-dd'),
          end_date: format(dateRange.to, 'yyyy-MM-dd')
        }
      });

      if (!error && data?.sentiment_data) {
        setSentimentData(data.sentiment_data);
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
              <Button variant="ghost" onClick={() => window.location.href = '/reviews'}>Reviews</Button>
              <Button variant="outline">Sentiment</Button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
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
        </div>
      </header>

      <div className="container mx-auto py-8 px-4">
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
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalPositive}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.positivePercentage.toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Negative Reviews</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.totalNegative}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.negativePercentage.toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Neutral Reviews</CardTitle>
                <Minus className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats.totalNeutral}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.neutralPercentage.toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sentiment;