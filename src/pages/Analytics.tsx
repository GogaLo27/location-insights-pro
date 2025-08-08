import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, Eye, MousePointer, Calendar, RefreshCw } from "lucide-react";
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

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("30");

  // Use location context to access the list and selected location
  const {
    locations,
    selectedLocation: ctxSelectedLocation,
    refreshLocations,
  } = useLocationContext();

  // Refresh the list of locations when the user logs in
  useEffect(() => {
    if (user && locations.length === 0) {
      refreshLocations();
    }
  }, [user]);

  // Fetch analytics whenever the selected location or date range changes
  useEffect(() => {
    if (ctxSelectedLocation) {
      fetchAnalytics();
    }
  }, [ctxSelectedLocation, dateRange]);

  const getSessionTokens = async () => {
    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      await supabase.auth.refreshSession();
      ({
        data: { session },
      } = await supabase.auth.getSession());
    }
    return {
      supabaseJwt: session?.access_token || "",
      googleAccessToken: session?.provider_token || "",
    };
  };

  const fetchAnalytics = async () => {
    // If no context-selected location yet, do nothing
    if (!ctxSelectedLocation) return;

    // Determine the numeric location ID required by the API
    const locationId =
      (ctxSelectedLocation as any).id ||
      (ctxSelectedLocation as any).location_id ||
      (ctxSelectedLocation as any).google_place_id?.split("/").pop();

    if (!locationId) return;

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

      const { data, error } = await supabase.functions.invoke(
        "google-business-api",
        {
          body: {
            action: "fetch_analytics",
            locationId,
            startDate: {
              year: startDate.getFullYear(),
              month: startDate.getMonth() + 1,
              day: startDate.getDate(),
            },
            endDate: {
              year: endDate.getFullYear(),
              month: endDate.getMonth() + 1,
              day: endDate.getDate(),
            },
          },
          headers: {
            Authorization: `Bearer ${supabaseJwt}`,
            "X-Google-Token": googleAccessToken,
          },
        }
      );

      if (!error && data?.analytics) {
        const processedData = processAnalyticsData(data.analytics);
        setAnalyticsData(processedData);

        if (processedData.length === 0) {
          toast({
            title: "No Analytics Data",
            description:
              "No analytics data available for the selected period. Try a different date range.",
          });
        }
      } else {
        console.error("Analytics fetch error:", error);
        setAnalyticsData([]);
        toast({
          title: "Analytics Error",
          description: error?.message || "Failed to load analytics data",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
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

  // Process the raw multiDailyMetricTimeSeries format from Google
  const processAnalyticsData = (raw: any): AnalyticsData[] => {
    if (!raw) return [];
    const seriesList: any[] = Array.isArray(raw)
      ? raw
      : raw.multiDailyMetricTimeSeries || raw.dailyMetricTimeSeries || [];
    if (!Array.isArray(seriesList) || seriesList.length === 0) return [];
    const byIndex: Record<number, AnalyticsData> = {};
    seriesList.forEach((series: any) => {
      const metric: string = series.dailyMetric || series.metric || "";
      const points: any[] =
        series.timeSeries?.datedValues || series.timeSeries || [];
      points.forEach((dp: any, index: number) => {
        const d = dp.date || dp.timeDimension?.timeRange?.startDate;
        if (!d) return;
        const dateLabel = format(
          new Date(d.year, (d.month || 1) - 1, d.day || 1),
          "MMM dd"
        );
        if (!byIndex[index]) {
          byIndex[index] = {
            date: dateLabel,
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
        const value = parseInt(dp.value ?? dp.metricValue ?? 0);
        switch (metric) {
          case "BUSINESS_IMPRESSIONS_DESKTOP_MAPS":
            byIndex[index].businessImpressionsDesktopMaps = value;
            break;
          case "BUSINESS_IMPRESSIONS_MOBILE_MAPS":
            byIndex[index].businessImpressionsMobileMaps = value;
            break;
          case "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH":
            byIndex[index].businessImpressionsDesktopSearch = value;
            break;
          case "BUSINESS_IMPRESSIONS_MOBILE_SEARCH":
            byIndex[index].businessImpressionsMobileSearch = value;
            break;
          case "WEBSITE_CLICKS":
            byIndex[index].websiteClicks = value;
            break;
          case "CALL_CLICKS":
            byIndex[index].callClicks = value;
            break;
          case "BUSINESS_DIRECTION_REQUESTS":
            byIndex[index].businessDirectionRequests = value;
            break;
          case "BUSINESS_CONVERSATIONS":
            byIndex[index].businessConversations = value;
            break;
          case "BUSINESS_BOOKINGS":
            byIndex[index].businessBookings = value;
            break;
          case "BUSINESS_FOOD_ORDERS":
            byIndex[index].businessFoodOrders = value;
            break;
          case "BUSINESS_FOOD_MENU_CLICKS":
            byIndex[index].businessFoodMenuClicks = value;
            break;
        }
      });
    });
    return Object.values(byIndex);
  };

  const getTotalImpressions = () => {
    return analyticsData.reduce(
      (sum, data) =>
        sum +
        data.businessImpressionsDesktopMaps +
        data.businessImpressionsMobileMaps +
        data.businessImpressionsDesktopSearch +
        data.businessImpressionsMobileSearch,
      0
    );
  };

  const getTotalClicks = () => {
    return analyticsData.reduce(
      (sum, data) =>
        sum + data.websiteClicks + data.callClicks + data.businessDirectionRequests,
      0
    );
  };

  const getImpressionsPieData = () => {
    const total = analyticsData.reduce(
      (acc, data) => ({
        desktop_maps: acc.desktop_maps + data.businessImpressionsDesktopMaps,
        mobile_maps: acc.mobile_maps + data.businessImpressionsMobileMaps,
        desktop_search: acc.desktop_search + data.businessImpressionsDesktopSearch,
        mobile_search: acc.mobile_search + data.businessImpressionsMobileSearch,
      }),
      { desktop_maps: 0, mobile_maps: 0, desktop_search: 0, mobile_search: 0 }
    );
    return [
      { name: "Desktop Maps", value: total.desktop_maps, color: "#8884d8" },
      { name: "Mobile Maps", value: total.mobile_maps, color: "#82ca9d" },
      { name: "Desktop Search", value: total.desktop_search, color: "#ffc658" },
      { name: "Mobile Search", value: total.mobile_search, color: "#ff7300" },
    ];
  };

  // Handle loading and authentication redirects
  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading analytics…</p>
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
              {/* Context-driven location selector */}
              <LocationSelector />
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              {/* Date range selector */}
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
              <Button onClick={fetchAnalytics} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
                <p className="text-muted-foreground">
                  Track your Google Business Profile performance and insights
                </p>
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {getTotalImpressions().toLocaleString()}
                  </div>
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
                  <div className="text-2xl font-bold">
                    {getTotalClicks().toLocaleString()}
                  </div>
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
                    {getTotalImpressions() > 0
                      ? ((getTotalClicks() / getTotalImpressions()) * 100).toFixed(1)
                      : 0}
                    %
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

            {/* Charts for impressions & actions */}
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
                      <Line
                        type="monotone"
                        dataKey="businessImpressionsDesktopMaps"
                        stroke="#8884d8"
                        name="Desktop Maps"
                      />
                      <Line
                        type="monotone"
                        dataKey="businessImpressionsMobileMaps"
                        stroke="#82ca9d"
                        name="Mobile Maps"
                      />
                      <Line
                        type="monotone"
                        dataKey="businessImpressionsDesktopSearch"
                        stroke="#ffc658"
                        name="Desktop Search"
                      />
                      <Line
                        type="monotone"
                        dataKey="businessImpressionsMobileSearch"
                        stroke="#ff7300"
                        name="Mobile Search"
                      />
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
                      <Bar
                        dataKey="websiteClicks"
                        fill="#8884d8"
                        name="Website Clicks"
                      />
                      <Bar dataKey="callClicks" fill="#82ca9d" name="Call Clicks" />
                      <Bar
                        dataKey="businessDirectionRequests"
                        fill="#ffc658"
                        name="Directions"
                      />
                      <Bar
                        dataKey="businessConversations"
                        fill="#ff7300"
                        name="Messages"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Pie chart and food orders/menu views */}
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
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
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
                      <Bar
                        dataKey="businessFoodOrders"
                        fill="#8884d8"
                        name="Food Orders"
                      />
                      <Bar
                        dataKey="businessFoodMenuClicks"
                        fill="#82ca9d"
                        name="Menu Clicks"
                      />
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
