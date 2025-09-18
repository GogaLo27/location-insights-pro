import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MapPin, Search, Plus, Trash2, Star, Phone, Globe, BarChart3, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import LocationSelector from "@/components/LocationSelector";

interface Competitor {
  id: string;
  user_id: string;
  competitor_name: string;
  google_place_id: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  average_rating?: number;
  total_reviews?: number;
  last_updated?: string;
}

const Competitors = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { selectedLocation } = useLocation();
  const { canUseCompetitorAnalysis } = usePlanFeatures();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState("");
  const [newCompetitorAddress, setNewCompetitorAddress] = useState("");

  useEffect(() => {
    if (user) {
      fetchCompetitors();
    }
  }, [user]);

  const fetchCompetitors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch latest analytics for each competitor
      const competitorsWithAnalytics = await Promise.all(
        (data || []).map(async (competitor) => {
          const { data: latestAnalytics } = await supabase
            .from('competitor_analytics')
            .select('average_rating, total_reviews, date')
            .eq('competitor_id', competitor.id)
            .order('date', { ascending: false })
            .limit(1)
            .single();

          return {
            ...competitor,
            average_rating: latestAnalytics?.average_rating || null,
            total_reviews: latestAnalytics?.total_reviews || 0,
            last_updated: latestAnalytics?.date || null
          };
        })
      );

      setCompetitors(competitorsWithAnalytics);
    } catch (error) {
      console.error('Error fetching competitors:', error);
      toast({
        title: "Error",
        description: "Failed to fetch competitors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!newCompetitorName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a competitor name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingCompetitor(true);
      const { data, error } = await supabase
        .from('competitors')
        .insert({
          user_id: user?.id,
          competitor_name: newCompetitorName.trim(),
          address: newCompetitorAddress.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      setNewCompetitorName("");
      setNewCompetitorAddress("");
      await fetchCompetitors();
      
      toast({
        title: "Success",
        description: "Competitor added successfully!",
      });
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Error",
        description: "Failed to add competitor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingCompetitor(false);
    }
  };

  const handleDeleteCompetitor = async (competitorId: string) => {
    try {
      const { error } = await supabase
        .from('competitors')
        .update({ is_active: false })
        .eq('id', competitorId);

      if (error) throw error;

      await fetchCompetitors();
      
      toast({
        title: "Success",
        description: "Competitor removed successfully!",
      });
    } catch (error) {
      console.error('Error deleting competitor:', error);
      toast({
        title: "Error",
        description: "Failed to remove competitor. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshCompetitorData = async (competitorId: string) => {
    try {
      // This would trigger the Google API to fetch fresh competitor data
      // For now, just show a success message
      toast({
        title: "Refreshing Data",
        description: "Competitor data is being refreshed. This may take a few minutes.",
      });
      
      // TODO: Implement actual data refresh via API call
    } catch (error) {
      console.error('Error refreshing competitor data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh competitor data. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading competitors...</p>
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
              <div>
                <h1 className="text-3xl font-bold mb-2">Competitor Analysis</h1>
                <p className="text-muted-foreground">
                  Monitor your competitors' review performance and gain market insights
                </p>
              </div>
              <Button onClick={() => window.location.href = '/competitors/analysis'}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analysis
              </Button>
            </div>

            {/* Add Competitor Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Add Competitor</CardTitle>
                <CardDescription>
                  Add competitors to monitor their review performance and compare with your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Competitor business name..."
                      value={newCompetitorName}
                      onChange={(e) => setNewCompetitorName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Address (optional)..."
                      value={newCompetitorAddress}
                      onChange={(e) => setNewCompetitorAddress(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCompetitor()}
                    />
                  </div>
                  <Button
                    onClick={handleAddCompetitor}
                    disabled={!newCompetitorName.trim() || isAddingCompetitor}
                  >
                    {isAddingCompetitor ? (
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Add Competitor
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Competitors List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading competitors...</p>
              </div>
            ) : competitors.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No competitors added yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Add your competitors to start monitoring their review performance and gain market insights.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {competitors
                  .filter((competitor) => {
                    const q = searchTerm.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      competitor.competitor_name.toLowerCase().includes(q) ||
                      (competitor.address || '').toLowerCase().includes(q)
                    );
                  })
                  .map((competitor) => (
                    <Card key={competitor.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{competitor.competitor_name}</CardTitle>
                            <CardDescription className="mt-1">
                              {competitor.address || 'No address provided'}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="capitalize">
                            Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="font-medium">
                                {competitor.average_rating ? competitor.average_rating.toFixed(1) : 'N/A'}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {competitor.total_reviews} reviews
                            </span>
                          </div>
                          
                          {competitor.phone && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              <span>{competitor.phone}</span>
                            </div>
                          )}
                          
                          {competitor.website && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Globe className="w-4 h-4" />
                              <span className="truncate">{competitor.website}</span>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleRefreshCompetitorData(competitor.id)}
                            >
                              <TrendingUp className="w-4 h-4 mr-2" />
                              Refresh Data
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCompetitor(competitor.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
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

export default Competitors;
