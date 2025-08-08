import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Eye, MousePointer, Phone, MapPin, Calendar, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays } from "date-fns";

interface AnalyticsData {
  date: string;
  businessImpressionsDesktopMaps: number;
  businessImpressionsMobileMaps: number;
  businessImpressionsDesktopSearch: number;
  businessImpressionsMobileSearch: number;
  websiteClicks: number;
  callClicks: number;
  businessDirectionRequests: number;
  businessConversations: number;
  businessBookings: number;
  businessFoodOrders: number;
  businessFoodMenuClicks: number;
}

interface Location {
  id: string;
  name: string;
  google_place_id: string;
}

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("30");

  useEffect(() => {
    if (user) {
      fetchLocations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedLocation) {
      fetchAnalytics();
    }
  }, [selectedLocation, dateRange]);

  const fetchLocations = async () => {
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'get_user_locations'
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (!error && data?.locations) {
        setLocations(data.locations);
        if (data.locations.length > 0) {
          setSelectedLocation(data.locations[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
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

  const fetchAnalytics = async () => {
    if (!selectedLocation) return;
    
    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = subDays(endDate, parseInt(dateRange));
      
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) {
        console.error("Missing authentication tokens");
        setAnalyticsData([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_analytics',
          locationId: selectedLocation,
          startDate: {
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1,
            day: startDate.getDate()
          },
          endDate: {
            year: endDate.getFullYear(),
            month: endDate.getMonth() + 1,
            day: endDate.getDate()
          }
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (!error && data?.analytics) {
        const processedData = processAnalyticsData(data.analytics);
        setAnalyticsData(processedData);
        
        // If no data, show helpful message
        if (processedData.length === 0) {
          toast({
            title: "No Analytics Data",
            description: "No analytics data available for the selected period. Try a different date range.",
          });
        }
      } else {
        console.error('Analytics fetch error:', error);
        setAnalyticsData([]);
        toast({
          title: "Analytics Error",
          description: error?.message || "Failed to load analytics data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalyticsData([]);
      toast({
        title: "Connection Error",
        description: "Unable to connect to analytics service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (rawData: any[]): AnalyticsData[] => {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) return [];
    
    const processedData: AnalyticsData[] = [];
    
    // Process each metric series
    rawData.forEach(series => {
      if (series.dailyMetricTimeSeries) {
        series.dailyMetricTimeSeries.forEach((timeSeries: any) => {
          const metric = timeSeries.dailyMetric;
          
          timeSeries.timeSeries?.forEach((dataPoint: any, index: number) => {
            if (!processedData[index]) {
              processedData[index] = {
                date: format(new Date(dataPoint.date.year, dataPoint.date.month - 1, dataPoint.date.day), 'MMM dd'),
                businessImpressionsDesktopMaps: 0,
                businessImpressionsMobileMaps: 0,
                businessImpressionsDesktopSearch: 0,
                businessImpressionsMobileSearch: 0,
                websiteClicks: 0,
                callClicks: 0,
                businessDirectionRequests: 0,
                businessConversations: 0,
                businessBookings: 0,
                businessFoodOrders: 0,
                businessFoodMenuClicks: 0,
              };
            }
            
            const value = parseInt(dataPoint.value || 0);
            
            switch (metric) {
              case 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS':
                processedData[index].businessImpressionsDesktopMaps = value;
                break;
              case 'BUSINESS_IMPRESSIONS_MOBILE_MAPS':
                processedData[index].businessImpressionsMobileMaps = value;
                break;
              case 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH':
                processedData[index].businessImpressionsDesktopSearch = value;
                break;
              case 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH':
                processedData[index].businessImpressionsMobileSearch = value;
                break;
              case 'WEBSITE_CLICKS':
                processedData[index].websiteClicks = value;
                break;
              case 'CALL_CLICKS':
                processedData[index].callClicks = value;
                break;
              case 'BUSINESS_DIRECTION_REQUESTS':
                processedData[index].businessDirectionRequests = value;
                break;
              case 'BUSINESS_CONVERSATIONS':
                processedData[index].businessConversations = value;
                break;
              case 'BUSINESS_BOOKINGS':
                processedData[index].businessBookings = value;
                break;
              case 'BUSINESS_FOOD_ORDERS':
                processedData[index].businessFoodOrders = value;
                break;
              case 'BUSINESS_FOOD_MENU_CLICKS':
                processedData[index].businessFoodMenuClicks = value;
                break;
            }
          });
        });
      }
    });
    
    return processedData.filter(Boolean);
  };

  const getTotalImpressions = () => {
    return analyticsData.reduce((sum, data) => 
      sum + data.businessImpressionsDesktopMaps + data.businessImpressionsMobileMaps + 
      data.businessImpressionsDesktopSearch + data.businessImpressionsMobileSearch, 0
    );
  };

  const getTotalClicks = () => {
    return analyticsData.reduce((sum, data) => 
      sum + data.websiteClicks + data.callClicks + data.businessDirectionRequests, 0
    );
  };

  const getImpressionsPieData = () => {
    const total = analyticsData.reduce((acc, data) => ({
      desktop_maps: acc.desktop_maps + data.businessImpressionsDesktopMaps,
      mobile_maps: acc.mobile_maps + data.businessImpressionsMobileMaps,
      desktop_search: acc.desktop_search + data.businessImpressionsDesktopSearch,
      mobile_search: acc.mobile_search + data.businessImpressionsMobileSearch,
    }), { desktop_maps: 0, mobile_maps: 0, desktop_search: 0, mobile_search: 0 });

    return [
      { name: 'Desktop Maps', value: total.desktop_maps, color: '#8884d8' },
      { name: 'Mobile Maps', value: total.mobile_maps, color: '#82ca9d' },
      { name: 'Desktop Search', value: total.desktop_search, color: '#ffc658' },
      { name: 'Mobile Search', value: total.mobile_search, color: '#ff7300' },
    ];
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading analytics...</p>
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
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={fetchAnalytics} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </header>
          
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
                <p className="text-muted-foreground">
                  Track your Google Business Profile performance and insights
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalImpressions().toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Views across search & maps
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getTotalClicks().toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Website, calls & directions
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Click-through Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getTotalImpressions() > 0 ? 
                      ((getTotalClicks() / getTotalImpressions()) * 100).toFixed(1) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clicks per impression
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.reduce((sum, data) => sum + data.businessBookings, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Direct bookings made
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Impressions Over Time</CardTitle>
                  <CardDescription>Daily views across search and maps</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="businessImpressionsDesktopMaps" stroke="#8884d8" name="Desktop Maps" />
                      <Line type="monotone" dataKey="businessImpressionsMobileMaps" stroke="#82ca9d" name="Mobile Maps" />
                      <Line type="monotone" dataKey="businessImpressionsDesktopSearch" stroke="#ffc658" name="Desktop Search" />
                      <Line type="monotone" dataKey="businessImpressionsMobileSearch" stroke="#ff7300" name="Mobile Search" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Actions</CardTitle>
                  <CardDescription>Daily clicks and interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="websiteClicks" fill="#8884d8" name="Website Clicks" />
                      <Bar dataKey="callClicks" fill="#82ca9d" name="Call Clicks" />
                      <Bar dataKey="businessDirectionRequests" fill="#ffc658" name="Directions" />
                      <Bar dataKey="businessConversations" fill="#ff7300" name="Messages" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Impressions by Source</CardTitle>
                  <CardDescription>Where your business appears</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getImpressionsPieData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getImpressionsPieData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Food Orders & Menu Views</CardTitle>
                  <CardDescription>Restaurant-specific metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="businessFoodOrders" fill="#8884d8" name="Food Orders" />
                      <Bar dataKey="businessFoodMenuClicks" fill="#82ca9d" name="Menu Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Analytics;