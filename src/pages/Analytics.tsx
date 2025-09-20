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
  AreaChart,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
} from "recharts";
import { TrendingUp, Eye, MousePointer, RefreshCw, Download, Filter, TrendingDown, ArrowUpRight, ArrowDownRight, CalendarIcon, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, subMonths, subYears } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { FeatureGate } from "@/components/UpgradePrompt";

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

interface ComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

interface ComparisonMetrics {
  impressions: ComparisonData;
  clicks: ComparisonData;
  ctr: ComparisonData;
  bookings: ComparisonData;
}

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { maxAnalyticsDays, canUseCustomDateRanges, canUseComparisonMode, canExportPDF } = usePlanFeatures();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [previousAnalyticsData, setPreviousAnalyticsData] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>("30");
  const [showComparison, setShowComparison] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [isCustomRange, setIsCustomRange] = useState(false);

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
      if (showComparison) {
        fetchPreviousAnalytics();
      }
    }
  }, [ctxSelectedLocation, dateRange, showComparison, isCustomRange, customDateRange]);

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
      // Demo: synthesize time series when in demo mode
      if (user?.email === 'demolip29@gmail.com') {
        const days = parseInt(dateRange);
        const endDate = new Date();
        const series: AnalyticsData[] = [] as any;
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(endDate);
          d.setDate(endDate.getDate() - i);
          const base = 100 + (locationId === 'demo-location-2' ? -20 : 0);
          const wobble = 1 + Math.sin(i / 3) * 0.2;
          series.push({
            date: format(d, 'MMM dd'),
            businessImpressionsDesktopMaps: Math.round(base * wobble * 2.1),
            businessImpressionsMobileMaps: Math.round(base * wobble * 2.6),
            businessImpressionsDesktopSearch: Math.round(base * wobble * 1.7),
            businessImpressionsMobileSearch: Math.round(base * wobble * 2.0),
            websiteClicks: Math.round(base * wobble * 0.15),
            callClicks: Math.round(base * wobble * 0.08),
            businessDirectionRequests: Math.round(base * wobble * 0.12),
            businessConversations: Math.round(base * wobble * 0.03),
            businessBookings: Math.round(base * wobble * 0.02),
            businessFoodOrders: Math.round(base * wobble * 0.05),
            businessFoodMenuClicks: Math.round(base * wobble * 0.07),
          });
        }
        setAnalyticsData(series);
        setLoading(false);
        return;
      }
      let endDate: Date;
      let startDate: Date;
      
      if (isCustomRange && customDateRange.from && customDateRange.to) {
        if (!validateDateRange()) return;
        startDate = customDateRange.from;
        endDate = customDateRange.to;
      } else {
        endDate = new Date();
        startDate = subDays(endDate, parseInt(dateRange));
      }
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

  const fetchPreviousAnalytics = async () => {
    if (!ctxSelectedLocation) return;

    const locationId =
      (ctxSelectedLocation as any).id ||
      (ctxSelectedLocation as any).location_id ||
      (ctxSelectedLocation as any).google_place_id?.split("/").pop();

    if (!locationId) return;

    try {
      let endDate: Date;
      let startDate: Date;
      
      if (isCustomRange && customDateRange.from && customDateRange.to) {
        const rangeDays = Math.ceil((customDateRange.to.getTime() - customDateRange.from.getTime()) / (1000 * 60 * 60 * 24));
        endDate = subDays(customDateRange.from, 1);
        startDate = subDays(endDate, rangeDays);
      } else {
        const days = parseInt(dateRange);
        endDate = subDays(new Date(), days);
        startDate = subDays(endDate, days);
      }

      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) return;

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
        setPreviousAnalyticsData(processedData);
      }
    } catch (error) {
      console.error("Error fetching previous analytics:", error);
    }
  };

  // Process the raw multiDailyMetricTimeSeries format from Google
const processAnalyticsData = (raw: any): AnalyticsData[] => {
  if (!raw) return [];

  let seriesList: any[] = [];
  if (Array.isArray(raw)) {
    seriesList = raw;
  } else if (raw?.multiDailyMetricTimeSeries) {
    seriesList = raw.multiDailyMetricTimeSeries.flatMap(
      (item: any) => item?.dailyMetricTimeSeries || []
    );
  } else if (raw?.dailyMetricTimeSeries) {
    seriesList = raw.dailyMetricTimeSeries;
  } else {
    seriesList = [];
  }

  if (!Array.isArray(seriesList) || seriesList.length === 0) return [];

  const byIndex: Record<number, AnalyticsData> = {};

  seriesList.forEach((series: any) => {
    const metric: string = series.dailyMetric || series.metric || "";
    const points: any[] =
      series.timeSeries?.datedValues ||
      series.timeSeries ||
      [];
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

  return Object.values(byIndex).map(data => ({
    ...data,
    totalImpressions: data.businessImpressionsDesktopMaps + data.businessImpressionsMobileMaps + data.businessImpressionsDesktopSearch + data.businessImpressionsMobileSearch,
    totalClicks: data.websiteClicks + data.callClicks + data.businessDirectionRequests,
  }));
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

  const getCTR = () => {
    const impressions = getTotalImpressions();
    const clicks = getTotalClicks();
    return impressions > 0 ? (clicks / impressions) * 100 : 0;
  };

  const getTotalBookings = () => {
    return analyticsData.reduce(
      (sum, data) =>
        sum + data.businessConversations + data.businessBookings + data.businessFoodOrders,
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

  const calculateComparison = (): ComparisonMetrics => {
    const currentImpressions = getTotalImpressions();
    const previousImpressions = previousAnalyticsData.reduce(
      (sum, data) =>
        sum +
        data.businessImpressionsDesktopMaps +
        data.businessImpressionsMobileMaps +
        data.businessImpressionsDesktopSearch +
        data.businessImpressionsMobileSearch,
      0
    );

    const currentClicks = getTotalClicks();
    const previousClicks = previousAnalyticsData.reduce(
      (sum, data) =>
        sum + data.websiteClicks + data.callClicks + data.businessDirectionRequests,
      0
    );

    const currentCTR = currentImpressions > 0 ? (currentClicks / currentImpressions) * 100 : 0;
    const previousCTR = previousImpressions > 0 ? (previousClicks / previousImpressions) * 100 : 0;

    const currentBookings = analyticsData.reduce((sum, data) => sum + data.businessBookings, 0);
    const previousBookings = previousAnalyticsData.reduce((sum, data) => sum + data.businessBookings, 0);

    const calculateChange = (current: number, previous: number) => {
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;
      return { current, previous, change, changePercent };
    };

    return {
      impressions: calculateChange(currentImpressions, previousImpressions),
      clicks: calculateChange(currentClicks, previousClicks),
      ctr: calculateChange(currentCTR, previousCTR),
      bookings: calculateChange(currentBookings, previousBookings),
    };
  };

  const getComparisonColor = (changePercent: number) => {
    if (changePercent > 0) return "text-green-600";
    if (changePercent < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getComparisonIcon = (changePercent: number) => {
    if (changePercent > 0) return <ArrowUpRight className="w-4 h-4" />;
    if (changePercent < 0) return <ArrowDownRight className="w-4 h-4" />;
    return null;
  };

  const getComparisonBadge = (changePercent: number) => {
    const isPositive = changePercent > 0;
    const isNegative = changePercent < 0;
    const isNeutral = changePercent === 0;
    
    return (
      <div className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        isPositive && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
        isNegative && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
        isNeutral && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
      )}>
        {getComparisonIcon(changePercent)}
        <span>
          {changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%
        </span>
      </div>
    );
  };

  const handleCustomDateChange = (from: Date | undefined, to: Date | undefined) => {
    console.log('Date range changed:', { from, to });
    setCustomDateRange({ from, to });
    if (from && to) {
      setIsCustomRange(true);
      setDateRange("custom");
      console.log('Custom range set:', { from, to });
    } else if (from) {
      // User is still selecting the end date
      setCustomDateRange({ from, to: undefined });
    }
  };

  const validateDateRange = () => {
    if (!customDateRange.from || !customDateRange.to) {
      toast({
        title: "Invalid Date Range",
        description: "Please select both start and end dates.",
        variant: "destructive",
      });
      return false;
    }
    if (customDateRange.from > customDateRange.to) {
      toast({
        title: "Invalid Date Range",
        description: "Start date cannot be after end date.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const getDateRangeLabel = () => {
    if (isCustomRange && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d, yyyy")}`;
    }
    if (dateRange === "custom") {
      return "Custom Range";
    }
    return `Last ${dateRange} days`;
  };

  const ChartHelpPopover = ({ title, description, details }: { title: string; description: string; details: string[] }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="space-y-1">
            {details.map((detail, index) => (
              <div key={index} className="text-xs text-muted-foreground">
                • {detail}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  const exportToCSV = () => {
    if (analyticsData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please load analytics data first before exporting.",
        variant: "destructive",
      });
      return;
    }

    let headers = [
      "Date",
      "Desktop Maps Impressions",
      "Mobile Maps Impressions", 
      "Desktop Search Impressions",
      "Mobile Search Impressions",
      "Website Clicks",
      "Call Clicks",
      "Direction Requests",
      "Conversations",
      "Bookings",
      "Food Orders",
      "Menu Clicks"
    ];

    // Add comparison headers if comparison data is available
    if (showComparison && previousAnalyticsData.length > 0) {
      headers = [
        ...headers,
        "Previous Desktop Maps Impressions",
        "Previous Mobile Maps Impressions",
        "Previous Desktop Search Impressions", 
        "Previous Mobile Search Impressions",
        "Previous Website Clicks",
        "Previous Call Clicks",
        "Previous Direction Requests",
        "Previous Conversations",
        "Previous Bookings",
        "Previous Food Orders",
        "Previous Menu Clicks",
        "Impressions Change %",
        "Clicks Change %",
        "CTR Change %",
        "Bookings Change %"
      ];
    }

    const csvContent = [
      headers.join(","),
      ...analyticsData.map((data, index) => {
        const row = [
          data.date,
          data.businessImpressionsDesktopMaps,
          data.businessImpressionsMobileMaps,
          data.businessImpressionsDesktopSearch,
          data.businessImpressionsMobileSearch,
          data.websiteClicks,
          data.callClicks,
          data.businessDirectionRequests,
          data.businessConversations,
          data.businessBookings,
          data.businessFoodOrders,
          data.businessFoodMenuClicks
        ];

        // Add comparison data if available
        if (showComparison && previousAnalyticsData.length > 0) {
          const comparison = calculateComparison();
          const prevData = previousAnalyticsData[index] || {
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
            businessFoodMenuClicks: 0
          };

          row.push(
            prevData.businessImpressionsDesktopMaps,
            prevData.businessImpressionsMobileMaps,
            prevData.businessImpressionsDesktopSearch,
            prevData.businessImpressionsMobileSearch,
            prevData.websiteClicks,
            prevData.callClicks,
            prevData.businessDirectionRequests,
            prevData.businessConversations,
            prevData.businessBookings,
            prevData.businessFoodOrders,
            prevData.businessFoodMenuClicks,
            comparison.impressions.changePercent.toFixed(2),
            comparison.clicks.changePercent.toFixed(2),
            comparison.ctr.changePercent.toFixed(2),
            comparison.bookings.changePercent.toFixed(2)
          );
        }

        return row.join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileName = `analytics-${ctxSelectedLocation?.location_name || 'data'}-${getDateRangeLabel().replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Analytics data has been exported to CSV file${showComparison ? ' with comparison data' : ''}.`,
    });
  };

  const exportToPDF = async () => {
    console.log('=== PDF EXPORT BUTTON CLICKED ===');
    console.log('PDF Export clicked, canExportPDF:', canExportPDF);
    console.log('Analytics data length:', analyticsData.length);
    console.log('User plan features:', { canExportPDF, maxAnalyticsDays, canUseCustomDateRanges });
    
    if (!canExportPDF) {
      console.log('PDF export not available for this plan');
      toast({
        title: "Feature Not Available",
        description: "PDF export is only available in Professional and Enterprise plans.",
        variant: "destructive",
      });
      return;
    }

    if (analyticsData.length === 0) {
      console.log('No analytics data to export');
      toast({
        title: "No Data to Export",
        description: "Please load analytics data first before exporting to PDF.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting PDF export process...');
    
    try {
      // Fetch brand information for the current location
      let brandInfo = null;
      if (user && ctxSelectedLocation) {
        const { data: locationData } = await supabase
          .from('user_locations')
          .select(`
            *,
            brand_profiles!user_locations_brand_id_fkey (
              id,
              brand_name,
              logo_url,
              primary_color,
              secondary_color,
              font_family,
              contact_email,
              contact_phone,
              website,
              address
            )
          `)
          .eq('user_id', user.id)
          .eq('google_place_id', ctxSelectedLocation.google_place_id)
          .single();

        if (locationData?.brand_profiles) {
          brandInfo = locationData.brand_profiles;
          console.log('Found brand info:', brandInfo);
          console.log('Logo URL:', brandInfo.logo_url);
        } else {
          console.log('No brand found for location:', ctxSelectedLocation.google_place_id);
          console.log('Location data:', locationData);
        }
      }

      // Generate HTML content for the PDF
      const locationName = ctxSelectedLocation?.location_name || 'Unknown Location';
      const dateRangeLabel = getDateRangeLabel();
      console.log('Location name:', locationName, 'Date range label:', dateRangeLabel);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Analytics Report - ${locationName}</title>
          <style>
            body { 
              font-family: ${brandInfo?.font_family || 'Arial, sans-serif'}; 
              margin: 20px; 
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 3px solid ${brandInfo?.primary_color || '#000000'};
              padding-bottom: 20px;
            }
            .brand-logo {
              max-height: 60px;
              margin-bottom: 10px;
            }
            .header h1 { 
              color: ${brandInfo?.primary_color || '#000000'}; 
              margin: 10px 0;
            }
            .header h2 { 
              color: ${brandInfo?.secondary_color || '#666666'}; 
              margin: 5px 0;
            }
            .summary { 
              background: ${brandInfo?.secondary_color ? brandInfo.secondary_color + '20' : '#f5f5f5'}; 
              padding: 15px; 
              border-radius: 5px; 
              margin-bottom: 20px; 
              border-left: 4px solid ${brandInfo?.primary_color || '#000000'};
            }
            .metrics { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
              gap: 15px; 
              margin-bottom: 30px; 
            }
            .metric-card { 
              border: 2px solid ${brandInfo?.primary_color || '#ddd'}; 
              padding: 15px; 
              border-radius: 5px; 
              text-align: center; 
              background: white;
            }
            .metric-value { 
              font-size: 24px; 
              font-weight: bold; 
              margin: 10px 0; 
              color: ${brandInfo?.primary_color || '#000000'};
            }
            .metric-label { 
              color: ${brandInfo?.secondary_color || '#666'}; 
              font-size: 14px; 
            }
            .comparison { 
              background: #e8f5e8; 
              padding: 10px; 
              border-radius: 5px; 
              margin: 5px 0; 
            }
            .comparison.negative { background: #ffeaea; }
            .comparison.neutral { background: #f0f0f0; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 20px; 
            }
            th, td { 
              border: 1px solid ${brandInfo?.secondary_color || '#ddd'}; 
              padding: 8px; 
              text-align: left; 
            }
            th { 
              background-color: ${brandInfo?.primary_color || '#f2f2f2'}; 
              color: white;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid ${brandInfo?.secondary_color || '#ddd'};
              font-size: 12px;
              color: ${brandInfo?.secondary_color || '#666'};
            }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${brandInfo?.logo_url ? `<img src="${brandInfo.logo_url}" alt="${brandInfo.brand_name}" class="brand-logo">` : ''}
            <h1>Analytics Report</h1>
            <h2>${locationName}</h2>
            <p>Generated on ${format(new Date(), 'MMM d, yyyy HH:mm')}</p>
          </div>
          
          <div class="summary">
            <h3>Report Summary</h3>
            <p><strong>Date Range:</strong> ${dateRangeLabel}</p>
            <p><strong>Total Records:</strong> ${analyticsData.length}</p>
            ${showComparison ? '<p><strong>Mode:</strong> Comparison Analysis</p>' : ''}
          </div>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-label">Total Impressions</div>
              <div class="metric-value">${getTotalImpressions().toLocaleString()}</div>
              ${showComparison && previousAnalyticsData.length > 0 ? 
                `<div class="comparison ${calculateComparison().impressions.changePercent >= 0 ? (calculateComparison().impressions.changePercent > 0 ? '' : 'neutral') : 'negative'}">
                  ${calculateComparison().impressions.changePercent > 0 ? '+' : ''}${calculateComparison().impressions.changePercent.toFixed(1)}% vs previous period
                </div>` : ''
              }
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Total Clicks</div>
              <div class="metric-value">${getTotalClicks().toLocaleString()}</div>
              ${showComparison && previousAnalyticsData.length > 0 ? 
                `<div class="comparison ${calculateComparison().clicks.changePercent >= 0 ? (calculateComparison().clicks.changePercent > 0 ? '' : 'neutral') : 'negative'}">
                  ${calculateComparison().clicks.changePercent > 0 ? '+' : ''}${calculateComparison().clicks.changePercent.toFixed(1)}% vs previous period
                </div>` : ''
              }
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Click-Through Rate</div>
              <div class="metric-value">${getCTR().toFixed(1)}%</div>
              ${showComparison && previousAnalyticsData.length > 0 ? 
                `<div class="comparison ${calculateComparison().ctr.changePercent >= 0 ? (calculateComparison().ctr.changePercent > 0 ? '' : 'neutral') : 'negative'}">
                  ${calculateComparison().ctr.changePercent > 0 ? '+' : ''}${calculateComparison().ctr.changePercent.toFixed(1)}% vs previous period
                </div>` : ''
              }
            </div>
            
            <div class="metric-card">
              <div class="metric-label">Total Bookings</div>
              <div class="metric-value">${getTotalBookings().toLocaleString()}</div>
              ${showComparison && previousAnalyticsData.length > 0 ? 
                `<div class="comparison ${calculateComparison().bookings.changePercent >= 0 ? (calculateComparison().bookings.changePercent > 0 ? '' : 'neutral') : 'negative'}">
                  ${calculateComparison().bookings.changePercent > 0 ? '+' : ''}${calculateComparison().bookings.changePercent.toFixed(1)}% vs previous period
                </div>` : ''
              }
            </div>
          </div>

          <h3>Daily Data</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Desktop Maps</th>
                <th>Mobile Maps</th>
                <th>Desktop Search</th>
                <th>Mobile Search</th>
                <th>Website Clicks</th>
                <th>Call Clicks</th>
                <th>Direction Requests</th>
                <th>Conversations</th>
                <th>Bookings</th>
                <th>Food Orders</th>
                <th>Menu Clicks</th>
              </tr>
            </thead>
            <tbody>
              ${analyticsData.map(data => `
                <tr>
                  <td>${data.date}</td>
                  <td>${data.businessImpressionsDesktopMaps}</td>
                  <td>${data.businessImpressionsMobileMaps}</td>
                  <td>${data.businessImpressionsDesktopSearch}</td>
                  <td>${data.businessImpressionsMobileSearch}</td>
                  <td>${data.websiteClicks}</td>
                  <td>${data.callClicks}</td>
                  <td>${data.businessDirectionRequests}</td>
                  <td>${data.businessConversations}</td>
                  <td>${data.businessBookings}</td>
                  <td>${data.businessFoodOrders}</td>
                  <td>${data.businessFoodMenuClicks}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${brandInfo ? `
          <div class="footer">
            <h4>${brandInfo.brand_name}</h4>
            ${brandInfo.contact_email ? `<p><strong>Email:</strong> ${brandInfo.contact_email}</p>` : ''}
            ${brandInfo.contact_phone ? `<p><strong>Phone:</strong> ${brandInfo.contact_phone}</p>` : ''}
            ${brandInfo.website ? `<p><strong>Website:</strong> ${brandInfo.website}</p>` : ''}
            ${brandInfo.address ? `<p><strong>Address:</strong> ${brandInfo.address}</p>` : ''}
          </div>
          ` : ''}
        </body>
      </html>
    `;

    // Create a blob and download it as HTML, then user can print to PDF
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    console.log('Creating download link...');
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${locationName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

      console.log('PDF export process initiated');
      toast({
        title: "Report Downloaded",
        description: "Analytics report has been downloaded as HTML. Open the file in your browser and use Ctrl+P to print as PDF.",
      });
    } catch (error) {
      console.error('Error during PDF export:', error);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the report. Please try again.",
        variant: "destructive",
      });
    }
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
              <LocationSelector />
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
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

            {/* Filters Section */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Date Range Selection</CardTitle>
                <CardDescription>
                  Choose the time period for your analytics data
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                  {/* Date Range Presets */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">Quick Select:</label>
                    <Select 
                      value={isCustomRange ? "custom" : dateRange} 
                      onValueChange={(value) => {
                        if (value === "custom") {
                          if (canUseCustomDateRanges) {
                            setIsCustomRange(true);
                            setDateRange("custom");
                          } else {
                            toast({
                              title: "Feature Not Available",
                              description: "Custom date ranges are only available in Professional and Enterprise plans.",
                              variant: "destructive",
                            });
                          }
                        } else {
                          const days = parseInt(value);
                          if (days <= maxAnalyticsDays) {
                            setIsCustomRange(false);
                            setDateRange(value);
                          } else {
                            toast({
                              title: "Date Range Limit",
                              description: `Your plan allows up to ${maxAnalyticsDays} days of analytics data.`,
                              variant: "destructive",
                            });
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        {maxAnalyticsDays > 30 && <SelectItem value="90">Last 90 days</SelectItem>}
                        {maxAnalyticsDays > 90 && <SelectItem value="180">Last 6 months</SelectItem>}
                        {maxAnalyticsDays > 180 && <SelectItem value="365">Last year</SelectItem>}
                        {canUseCustomDateRanges && <SelectItem value="custom">Custom Range</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Date Range */}
                  <FeatureGate feature="Custom Date Ranges" variant="inline">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium whitespace-nowrap">Custom Range:</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-64 justify-start text-left font-normal",
                              !customDateRange.from && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customDateRange.from ? (
                              customDateRange.to ? (
                                `${format(customDateRange.from, "MMM d, yyyy")} - ${format(customDateRange.to, "MMM d, yyyy")}`
                              ) : (
                                format(customDateRange.from, "MMM d, yyyy")
                              )
                            ) : (
                              "Pick a date range"
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={customDateRange.from || new Date()}
                            selected={customDateRange}
                            onSelect={(range) => {
                              console.log('Calendar onSelect called with:', range);
                              if (range?.from && range?.to) {
                                setCustomDateRange({ from: range.from, to: range.to });
                                setIsCustomRange(true);
                                setDateRange("custom");
                                console.log('Custom range set:', { from: range.from, to: range.to });
                              } else if (range?.from) {
                                setCustomDateRange({ from: range.from, to: undefined });
                              }
                            }}
                            numberOfMonths={2}
                            disabled={(date) => date > new Date() || date < new Date('2020-01-01')}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </FeatureGate>

                  {/* Comparison Toggle */}
                  <FeatureGate feature="Comparison Mode" variant="inline">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium whitespace-nowrap">Comparison:</label>
                      <Button
                        variant={showComparison ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowComparison(!showComparison)}
                        className="min-w-[140px]"
                      >
                        {showComparison ? "Hide Comparison" : "Show Comparison"}
                      </Button>
                    </div>
                  </FeatureGate>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-auto">
                    <Button onClick={exportToCSV} variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <FeatureGate feature="PDF Export" variant="inline">
                      <Button onClick={exportToPDF} variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                      </Button>
                    </FeatureGate>
                    <Button onClick={fetchAnalytics} size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Info */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Analytics Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    Showing data for <strong>{getDateRangeLabel()}</strong> • 
                    Location: <strong>{ctxSelectedLocation?.location_name || 'Not selected'}</strong> • 
                    Total records: <strong>{analyticsData.length}</strong>
                    {showComparison && (
                      <span> • <strong>Comparison mode</strong></span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    Last updated: {format(new Date(), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
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
                  {showComparison && previousAnalyticsData.length > 0 && (
                    <div className="mt-3">
                      {getComparisonBadge(calculateComparison().impressions.changePercent)}
                      <p className="text-xs text-muted-foreground mt-1">
                        vs previous period
                      </p>
                    </div>
                  )}
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
                  {showComparison && previousAnalyticsData.length > 0 && (
                    <div className="mt-3">
                      {getComparisonBadge(calculateComparison().clicks.changePercent)}
                      <p className="text-xs text-muted-foreground mt-1">
                        vs previous period
                      </p>
                    </div>
                  )}
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
                  {showComparison && previousAnalyticsData.length > 0 && (
                    <div className="mt-3">
                      {getComparisonBadge(calculateComparison().ctr.changePercent)}
                      <p className="text-xs text-muted-foreground mt-1">
                        vs previous period
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analyticsData.reduce((sum, data) => sum + data.businessBookings, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Direct bookings made
                  </p>
                  {showComparison && previousAnalyticsData.length > 0 && (
                    <div className="mt-3">
                      {getComparisonBadge(calculateComparison().bookings.changePercent)}
                      <p className="text-xs text-muted-foreground mt-1">
                        vs previous period
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Comparison Summary */}
            {showComparison && previousAnalyticsData.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance Comparison
                  </CardTitle>
                  <CardDescription>
                    Current period vs previous period performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Impressions</span>
                        {getComparisonBadge(calculateComparison().impressions.changePercent)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getTotalImpressions().toLocaleString()} vs {calculateComparison().impressions.previous.toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Clicks</span>
                        {getComparisonBadge(calculateComparison().clicks.changePercent)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getTotalClicks().toLocaleString()} vs {calculateComparison().clicks.previous.toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">CTR</span>
                        {getComparisonBadge(calculateComparison().ctr.changePercent)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getTotalImpressions() > 0 ? ((getTotalClicks() / getTotalImpressions()) * 100).toFixed(1) : 0}% vs {calculateComparison().ctr.previous.toFixed(1)}%
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Bookings</span>
                        {getComparisonBadge(calculateComparison().bookings.changePercent)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {analyticsData.reduce((sum, data) => sum + data.businessBookings, 0)} vs {calculateComparison().bookings.previous}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Charts for impressions & actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Impressions Over Time</CardTitle>
                      <CardDescription>Daily views across search and maps</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Impressions Over Time"
                      description="Shows how many times your business listing appeared in Google Search and Maps results each day."
                      details={[
                        "Desktop Maps: Views when users see your business on Google Maps (desktop)",
                        "Mobile Maps: Views when users see your business on Google Maps (mobile)",
                        "Desktop Search: Views when users see your business in search results (desktop)",
                        "Mobile Search: Views when users see your business in search results (mobile)",
                        "Higher impressions = more visibility to potential customers"
                      ]}
                    />
                  </div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>User Actions</CardTitle>
                      <CardDescription>Daily clicks and interactions</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="User Actions"
                      description="Shows the number of actions customers took when they found your business listing."
                      details={[
                        "Website Clicks: Users who clicked to visit your website",
                        "Call Clicks: Users who clicked to call your business",
                        "Directions: Users who requested directions to your location",
                        "Messages: Users who started a conversation with your business",
                        "These actions indicate customer interest and engagement"
                      ]}
                    />
                  </div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Impressions by Source</CardTitle>
                      <CardDescription>Where your business appears</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Impressions by Source"
                      description="Shows the distribution of your business impressions across different Google platforms."
                      details={[
                        "Desktop Maps: Business listings on Google Maps (desktop version)",
                        "Mobile Maps: Business listings on Google Maps (mobile app)",
                        "Desktop Search: Business listings in Google Search results (desktop)",
                        "Mobile Search: Business listings in Google Search results (mobile)",
                        "Helps you understand which platforms drive the most visibility"
                      ]}
                    />
                  </div>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Food Orders & Menu Views</CardTitle>
                      <CardDescription>Restaurant-specific metrics</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Food Orders & Menu Views"
                      description="Shows restaurant-specific engagement metrics for food-related businesses."
                      details={[
                        "Food Orders: Direct food orders placed through your Google Business listing",
                        "Menu Clicks: Users who clicked to view your menu",
                        "These metrics are only available for restaurants and food businesses",
                        "Higher numbers indicate strong customer interest in your food offerings",
                        "Use this data to optimize your menu presentation and food descriptions"
                      ]}
                    />
                  </div>
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

            {/* Advanced Analytics Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Impressions vs Clicks Trend</CardTitle>
                      <CardDescription>Relationship between impressions and clicks over time</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Impressions vs Clicks Trend"
                      description="Shows the relationship between how many times your business was seen (impressions) and how many actions users took (clicks)."
                      details={[
                        "Left axis (blue): Total impressions across all platforms",
                        "Right axis (green): Total clicks (website, calls, directions)",
                        "Look for patterns where impressions and clicks move together",
                        "Gaps between impressions and clicks indicate missed opportunities",
                        "Higher click rates relative to impressions show better engagement"
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={analyticsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalImpressions"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                        name="Total Impressions"
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="totalClicks"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.3}
                        name="Total Clicks"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Click-Through Rate Analysis</CardTitle>
                      <CardDescription>CTR performance over time</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Click-Through Rate Analysis"
                      description="Shows your daily click-through rate (CTR) - the percentage of people who took action after seeing your business."
                      details={[
                        "CTR = (Total Clicks ÷ Total Impressions) × 100",
                        "Higher CTR means more people are engaging with your listing",
                        "Industry average CTR is typically 2-5%",
                        "Consistent high CTR indicates strong listing optimization",
                        "Use this to track the effectiveness of your business profile"
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analyticsData.map(data => ({
                      ...data,
                      ctr: data.businessImpressionsDesktopMaps + data.businessImpressionsMobileMaps + data.businessImpressionsDesktopSearch + data.businessImpressionsMobileSearch > 0 
                        ? ((data.websiteClicks + data.callClicks + data.businessDirectionRequests) / (data.businessImpressionsDesktopMaps + data.businessImpressionsMobileMaps + data.businessImpressionsDesktopSearch + data.businessImpressionsMobileSearch)) * 100 
                        : 0
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'CTR']} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ctr"
                        stroke="#ff7300"
                        strokeWidth={3}
                        name="Click-Through Rate"
                        dot={{ fill: '#ff7300', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Performance Insights */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Top Performing Day</CardTitle>
                      <CardDescription>Best day for impressions</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Top Performing Day"
                      description="Shows the date when your business received the highest number of impressions."
                      details={[
                        "Based on total impressions across all platforms",
                        "Helps identify your peak visibility days",
                        "Use this to understand seasonal or weekly patterns",
                        "Consider what marketing activities happened on this day",
                        "Replicate successful strategies on similar days"
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {analyticsData.length > 0 ? analyticsData.reduce((best, current) => {
                        const currentTotal = current.businessImpressionsDesktopMaps + current.businessImpressionsMobileMaps + current.businessImpressionsDesktopSearch + current.businessImpressionsMobileSearch;
                        const bestTotal = best.businessImpressionsDesktopMaps + best.businessImpressionsMobileMaps + best.businessImpressionsDesktopSearch + best.businessImpressionsMobileSearch;
                        return currentTotal > bestTotal ? current : best;
                      }).date : 'N/A'}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {analyticsData.length > 0 ? `${analyticsData.reduce((best, current) => {
                        const currentTotal = current.businessImpressionsDesktopMaps + current.businessImpressionsMobileMaps + current.businessImpressionsDesktopSearch + current.businessImpressionsMobileSearch;
                        const bestTotal = best.businessImpressionsDesktopMaps + best.businessImpressionsMobileMaps + best.businessImpressionsDesktopSearch + best.businessImpressionsMobileSearch;
                        return currentTotal > bestTotal ? current : best;
                      }, analyticsData[0]).businessImpressionsDesktopMaps + analyticsData.reduce((best, current) => {
                        const currentTotal = current.businessImpressionsDesktopMaps + current.businessImpressionsMobileMaps + current.businessImpressionsDesktopSearch + current.businessImpressionsMobileSearch;
                        const bestTotal = best.businessImpressionsDesktopMaps + best.businessImpressionsMobileMaps + best.businessImpressionsDesktopSearch + best.businessImpressionsMobileSearch;
                        return currentTotal > bestTotal ? current : best;
                      }, analyticsData[0]).businessImpressionsMobileMaps + analyticsData.reduce((best, current) => {
                        const currentTotal = current.businessImpressionsDesktopMaps + current.businessImpressionsMobileMaps + current.businessImpressionsDesktopSearch + current.businessImpressionsMobileSearch;
                        const bestTotal = best.businessImpressionsDesktopMaps + best.businessImpressionsMobileMaps + best.businessImpressionsDesktopSearch + best.businessImpressionsMobileSearch;
                        return currentTotal > bestTotal ? current : best;
                      }, analyticsData[0]).businessImpressionsDesktopSearch + analyticsData.reduce((best, current) => {
                        const currentTotal = current.businessImpressionsDesktopMaps + current.businessImpressionsMobileMaps + current.businessImpressionsDesktopSearch + current.businessImpressionsMobileSearch;
                        const bestTotal = best.businessImpressionsDesktopMaps + best.businessImpressionsMobileMaps + best.businessImpressionsDesktopSearch + best.businessImpressionsMobileSearch;
                        return currentTotal > bestTotal ? current : best;
                      }, analyticsData[0]).businessImpressionsMobileSearch} impressions` : 'No data'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Average Daily CTR</CardTitle>
                      <CardDescription>Overall click-through rate</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Average Daily CTR"
                      description="Shows your overall click-through rate across the selected time period."
                      details={[
                        "Calculated as total clicks divided by total impressions",
                        "Higher CTR indicates better listing optimization",
                        "Industry benchmarks: 2-5% is typical",
                        "Above 5% is considered excellent performance",
                        "Use this to measure your listing's effectiveness"
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {getTotalImpressions() > 0 ? ((getTotalClicks() / getTotalImpressions()) * 100).toFixed(2) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {getTotalClicks().toLocaleString()} clicks from {getTotalImpressions().toLocaleString()} impressions
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Conversion Rate</CardTitle>
                      <CardDescription>Clicks to bookings ratio</CardDescription>
                    </div>
                    <ChartHelpPopover
                      title="Conversion Rate"
                      description="Shows what percentage of clicks resulted in actual bookings or conversions."
                      details={[
                        "Calculated as bookings divided by total clicks",
                        "Measures how effectively clicks turn into business",
                        "Higher conversion rate means better customer quality",
                        "Low conversion rate may indicate targeting issues",
                        "Focus on improving this metric for better ROI"
                      ]}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {getTotalClicks() > 0 ? ((analyticsData.reduce((sum, data) => sum + data.businessBookings, 0) / getTotalClicks()) * 100).toFixed(2) : 0}%
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {analyticsData.reduce((sum, data) => sum + data.businessBookings, 0)} bookings from {getTotalClicks().toLocaleString()} clicks
                    </p>
                  </div>
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
