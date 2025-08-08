import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleBarChart, SimpleLineChart, SimplePieChart } from "@/components/ui/charts";
import { MapPin, BarChart3, MessageSquare, Settings, LogOut, TrendingUp, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileLoading(true);
      setStatsLoading(true);
      fetchProfile();
      fetchDashboardStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      // Use mock data until database migration is executed
      setProfile({
        id: user?.id || '',
        email: user?.email || '',
        full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
        subscription_plan: 'free',
        locations_limit: 2,
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
      // Use mock data until database migration is executed
      setStats({
        totalLocations: 0,
        totalReviews: 0,
        averageRating: 0,
        sentimentBreakdown: {
          positive: 0,
          negative: 0,
          neutral: 0,
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || profileLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Location Insights Pro</span>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="capitalize">
              {profile?.subscription_plan || 'free'} Plan
            </Badge>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name || user.email}!
          </h1>
          <p className="text-muted-foreground">
            Manage your Google Business locations and reviews from one powerful dashboard.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLocations || 0}</div>
              <p className="text-xs text-muted-foreground">
                of {profile?.locations_limit} allowed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalReviews || 0}</div>
              <p className="text-xs text-muted-foreground">
                across all locations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.averageRating.toFixed(1) || '0.0'}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.totalReviews ? 'from customer reviews' : 'no reviews yet'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentiment Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.sentimentBreakdown.positive ? 
                  Math.round((stats.sentimentBreakdown.positive / stats.totalReviews) * 100) + '%' : 
                  '-%'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                positive sentiment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
              <CardDescription>
                Distribution of customer sentiment across reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentimentChartData.length > 0 ? (
                <SimplePieChart data={sentimentChartData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>No sentiment data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rating Trend</CardTitle>
              <CardDescription>
                Average rating over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleLineChart data={ratingTrendData} />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {stats?.totalLocations === 0 ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                You haven't connected any Google Business locations yet. Start by adding your first location to unlock powerful insights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No locations found</h3>
                <p className="text-muted-foreground mb-6">
                  Connect your Google Business Profile to start analyzing your reviews and performance.
                </p>
                <Button onClick={() => window.location.href = '/locations'} className="bg-primary hover:bg-primary/90">
                  <MapPin className="w-4 h-4 mr-2" />
                  Add Your First Location
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/locations'}>
            <CardContent className="p-6 text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Locations</h3>
              <p className="text-sm text-muted-foreground">Manage business locations</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/reviews'}>
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Reviews</h3>
              <p className="text-sm text-muted-foreground">Analyze customer feedback</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => window.location.href = '/sentiment'}>
            <CardContent className="p-6 text-center">
              <BarChart3 className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Sentiment</h3>
              <p className="text-sm text-muted-foreground">AI sentiment analysis</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Settings className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold mb-1">Settings</h3>
              <p className="text-sm text-muted-foreground">Account preferences</p>
            </CardContent>
          </Card>
        </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;