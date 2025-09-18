import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MapPin, Search, Plus, RefreshCw, Star, Phone, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEMO_EMAIL, mockLocations } from "@/utils/mockData";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { UpgradePrompt } from "@/components/UpgradePrompt";

interface Location {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  total_reviews: number;
  latitude: number | null;
  longitude: number | null;
  status: string;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_plan: string;
  locations_limit: number;
  reviews_limit: number;
}

const Locations = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setSelectedLocation, refreshLocations } = useLocationContext();
  const { maxLocations, canAddMoreLocations, planType } = usePlanFeatures();
  const [locations, setLocations] = useState<Location[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshLocations = async () => {
    try {
      setIsRefreshing(true);
      await refreshLocations();
      await fetchLocations(); // Also refresh the local locations state
      toast({
        title: "Locations Refreshed",
        description: "Location data has been updated from Google Business Profile",
      });
    } catch (error) {
      console.error('Error refreshing locations:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh location data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchLocations();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
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
    }
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      // Demo: use mock locations without calling Google
      if (user?.email === DEMO_EMAIL) {
        // Get actual review counts for demo locations
        const demoLocationsWithCounts = await Promise.all(
          mockLocations.map(async (m) => {
            // Count reviews for this location
            const { count } = await supabase
              .from('saved_reviews')
              .select('*', { count: 'exact', head: true })
              .eq('location_id', m.id);
            
            return {
              id: m.id,
              google_place_id: m.google_place_id,
              name: m.name,
              address: m.address ?? null,
              phone: null,
              website: null,
              rating: m.id === 'demo-location-2' ? 4.2 : 4.6,
              total_reviews: count || 0,
              latitude: null,
              longitude: null,
              status: 'active',
              last_fetched_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          })
        );
        setLocations(demoLocationsWithCounts);
        return;
      }
      let { data: { session } } = await supabase.auth.getSession();
      let googleAccessToken = session?.provider_token;
      if (!googleAccessToken) {
        await supabase.auth.refreshSession();
        ({ data: { session } } = await supabase.auth.getSession());
        googleAccessToken = session?.provider_token;
      }
      const supabaseJwt = session?.access_token;
      if (!supabaseJwt || !googleAccessToken) {
        toast({
          title: "Authentication Required",
          description: "Please sign out and sign in with Google again to access your business data",
          variant: "destructive",
        });
        setLocations([]);
        return;
      }
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { action: 'fetch_user_locations' },
        headers: {
          'Authorization': `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken
        }
      });
      if (error) {
        console.log('Error fetching locations:', error);
        setLocations([]);
      } else {
        // For real users, use the data directly from Google API
        // Google API already provides rating and total_reviews
        console.log('Google API locations data:', data?.locations);
        if (data?.locations) {
          data.locations.forEach((location: any, index: number) => {
            console.log(`Location ${index + 1}:`, {
              name: location.name,
              rating: location.rating,
              total_reviews: location.total_reviews,
              id: location.id
            });
          });
        }
        
        // If Google API doesn't provide rating/review data, try to get it from our database
        const locationsWithFallbackData = await Promise.all(
          (data?.locations || []).map(async (location: any) => {
            // If Google API didn't provide rating/review data, try database fallback
            if (!location.rating && !location.total_reviews) {
              try {
                const { count } = await supabase
                  .from('saved_reviews')
                  .select('*', { count: 'exact', head: true })
                  .eq('location_id', location.id);
                
                if (count && count > 0) {
                  // Get reviews to calculate average rating
                  const { data: reviews } = await supabase
                    .from('saved_reviews')
                    .select('rating')
                    .eq('location_id', location.id);
                  
                  if (reviews && reviews.length > 0) {
                    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
                    const averageRating = totalRating / reviews.length;
                    
                    console.log(`Database fallback for ${location.name}:`, {
                      rating: averageRating,
                      total_reviews: count
                    });
                    
                    return {
                      ...location,
                      rating: averageRating,
                      total_reviews: count
                    };
                  }
                }
              } catch (error) {
                console.log(`Database fallback failed for ${location.name}:`, error);
              }
            }
            
            return location;
          })
        );
        
        setLocations(locationsWithFallbackData);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromGoogle = async () => {
    try {
      if (user?.email === DEMO_EMAIL) {
        toast({ title: "Demo Mode", description: "Using mock locations in demo." });
        setLocations(mockLocations.map((m) => ({
          id: m.id,
          google_place_id: m.google_place_id,
          name: m.name,
          address: m.address ?? null,
          phone: null,
          website: null,
          rating: m.id === 'demo-location-2' ? 4.2 : 4.6,
          total_reviews: 50,
          latitude: null,
          longitude: null,
          status: 'active',
          last_fetched_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }) as any));
        return;
      }
      let { data: { session } } = await supabase.auth.getSession();
      let googleAccessToken = session?.provider_token;
      if (!googleAccessToken) {
        await supabase.auth.refreshSession();
        ({ data: { session } } = await supabase.auth.getSession());
        googleAccessToken = session?.provider_token;
      }
      const supabaseJwt = session?.access_token;
      if (!supabaseJwt || !googleAccessToken) {
        toast({
          title: "Error",
          description: "Please sign in with Google to access your business data",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { action: 'fetch_user_locations' },
        headers: {
          'Authorization': `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken
        }
      });
      if (error) {
        console.log('Google API fetch failed:', error);
        return;
      }
      if (data?.locations?.length > 0) {
        toast({
          title: "Success",
          description: `Found ${data.locations.length} locations from Google Business`,
        });
        setLocations(data.locations);
      }
    } catch (error) {
      console.log('Error fetching from Google:', error);
    }
  };

  const handleSearchLocations = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }
    // Demo: pretend search found our mock locations and show them
    if (user?.email === DEMO_EMAIL) {
      const filtered = mockLocations.filter((l) =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.address || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setLocations((filtered.length > 0 ? filtered : mockLocations).map((m) => ({
        id: m.id,
        google_place_id: m.google_place_id,
        name: m.name,
        address: m.address ?? null,
        phone: null,
        website: null,
        rating: m.id === 'demo-location-2' ? 4.2 : 4.6,
        total_reviews: 50,
        latitude: null,
        longitude: null,
        status: 'active',
        last_fetched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as any);
      toast({ title: "Success", description: `Found ${(filtered.length > 0 ? filtered : mockLocations).length} locations` });
      return;
    }
    // Check location limits based on plan
    if (!canAddMoreLocations(locations.length)) {
      toast({
        title: "Location Limit Reached",
        description: `You've reached your limit of ${maxLocations === -1 ? 'unlimited' : maxLocations} locations. Upgrade your plan to add more.`,
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSearching(true);
      let { data: { session } } = await supabase.auth.getSession();
      let googleAccessToken = session?.provider_token;
      if (!googleAccessToken) {
        await supabase.auth.refreshSession();
        ({ data: { session } } = await supabase.auth.getSession());
        googleAccessToken = session?.provider_token;
      }
      const supabaseJwt = session?.access_token;
      if (!supabaseJwt || !googleAccessToken) {
        toast({
          title: "Error",
          description: "Please sign in with Google to access your business data",
          variant: "destructive",
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { action: 'search_locations', query: searchTerm },
        headers: {
          'Authorization': `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken
        }
      });
      if (error) {
        throw error;
      }
      toast({
        title: "Success",
        description: `Found ${data?.locations?.length || 0} locations`,
      });
      fetchLocations();
    } catch (error) {
      console.error('Error searching locations:', error);
      toast({
        title: "Error",
        description: "Failed to search locations",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading locations...</p>
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
            <div className="flex items-center space-x-4 ml-auto">
              <Badge variant="secondary" className="capitalize">
                {planType || 'starter'} Plan
              </Badge>
              <span className="text-sm text-muted-foreground">
                {locations.length} of {maxLocations === -1 ? '∞' : maxLocations} locations used
              </span>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Business Locations</h1>
                <p className="text-muted-foreground">
                  Manage your Google Business locations and track their performance
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleRefreshLocations}
                  disabled={isRefreshing || loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Locations
                </Button>
                {canAddMoreLocations(locations.length) && (
                  <Button onClick={() => navigate('/location-selection')} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                )}
              </div>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Find Location</CardTitle>
                <CardDescription>
                  Type to filter your locations. To add new ones, use search.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search for your business name or address..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchLocations()}
                    />
                  </div>
                  <Button
                    onClick={handleSearchLocations}
                    disabled={!searchTerm.trim() || isSearching}
                  >
                    {isSearching ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Search Locations
                  </Button>
                </div>
              </CardContent>
            </Card>

            {locations.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No locations found</h3>
                  <p className="text-muted-foreground mb-6">
                    Search and add your Google Business locations to get started with review management and analytics.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations
                  .filter((l) => {
                    const q = searchTerm.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      l.name.toLowerCase().includes(q) ||
                      (l.address || '').toLowerCase().includes(q)
                    );
                  })
                  .map((location) => (
                  <Card key={location.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{location.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {location.address}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={location.status === 'active' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {location.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-medium">{location.rating?.toFixed(1) || 'N/A'}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {location.total_reviews} reviews
                          </span>
                        </div>
                        {location.phone && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{location.phone}</span>
                          </div>
                        )}
                        {location.website && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Globe className="w-4 h-4" />
                            <span className="truncate">{location.website}</span>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                              await setSelectedLocation({
                                google_place_id: location.google_place_id,
                                location_name: location.name,
                              });
                              navigate('/reviews');
                            }}
                          >
                            View Reviews
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={async () => {
                              await setSelectedLocation({
                                google_place_id: location.google_place_id,
                                location_name: location.name,
                              });
                              navigate('/sentiment');
                            }}
                          >
                            Analytics
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Show upgrade prompt when location limit is reached */}
            {!canAddMoreLocations(locations.length) && locations.length > 0 && (
              <div className="mt-8">
                <UpgradePrompt 
                  feature="Multiple Locations"
                  title="Location Limit Reached"
                  description={`You've reached your limit of ${maxLocations} locations. Upgrade to add more locations and unlock advanced features.`}
                  variant="card"
                />
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Locations;
