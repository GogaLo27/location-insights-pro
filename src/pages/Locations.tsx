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
  const { setSelectedLocation } = useLocationContext();
  const [locations, setLocations] = useState<Location[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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
        const demo: Location[] = mockLocations.map((m) => ({
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
        }));
        setLocations(demo);
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
        setLocations(data?.locations || []);
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
    if (profile && locations.length >= profile.locations_limit) {
      toast({
        title: "Limit Reached",
        description: `You've reached your limit of ${profile.locations_limit} locations. Upgrade your plan to add more.`,
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
                {profile?.subscription_plan || 'free'} Plan
              </Badge>
              <span className="text-sm text-muted-foreground">
                {locations.length} of {profile?.locations_limit || 2} locations used
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
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Locations;
