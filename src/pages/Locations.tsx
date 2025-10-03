import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MapPin, Search, Plus, RefreshCw, Star, Phone, Globe, Palette, Edit } from "lucide-react";
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
  brand_id?: string | null;
  brand_name?: string | null;
}

interface BrandProfile {
  id: string;
  brand_name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  is_default: boolean;
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
  const { maxLocations, canAddMoreLocations, planType, canUseReviewTemplates } = usePlanFeatures();
  const [locations, setLocations] = useState<Location[]>([]);
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assigningLocation, setAssigningLocation] = useState<Location | null>(null);

  // Fetch brands
  const fetchBrands = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('Fetched brands:', data);
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  // Assign brand to location
  const handleAssignBrand = async (locationId: string, brandId: string | null) => {
    try {
      const { error } = await supabase
        .from('user_locations')
        .update({ brand_id: brandId })
        .eq('user_id', user?.id)
        .eq('id', locationId);

      if (error) throw error;

      // Update local state
      setLocations(locations.map(loc => 
        loc.id === locationId 
          ? { ...loc, brand_id: brandId, brand_name: brandId ? brands.find(b => b.id === brandId)?.brand_name : null }
          : loc
      ));

      toast({
        title: "Success",
        description: brandId ? "Brand assigned successfully" : "Brand removed successfully",
      });
    } catch (error) {
      console.error('Error assigning brand:', error);
      toast({
        title: "Error",
        description: "Failed to assign brand",
        variant: "destructive",
      });
    }
  };

  const handleRefreshLocations = async () => {
    try {
      setIsRefreshing(true);
      
      // Call Google API directly and update database
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
        console.error('Error fetching locations from Google:', error);
        toast({
          title: "Refresh Failed",
          description: "Failed to fetch location data from Google. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data?.locations) {
        // Get existing locations to check for duplicates
        const { data: existingLocations } = await supabase
          .from('user_locations')
          .select('google_place_id')
          .eq('user_id', user.id);

        // Normalize existing place IDs (remove 'locations/' prefix if present)
        const existingPlaceIds = new Set(
          existingLocations?.map(loc => 
            loc.google_place_id.replace(/^locations\//, '')
          ) || []
        );

        // Filter out locations that already exist (normalize the incoming place IDs too)
        const newLocations = data.locations.filter((location: any) => {
          const normalizedPlaceId = location.google_place_id.replace(/^locations\//, '');
          return !existingPlaceIds.has(normalizedPlaceId);
        });

        console.log(`Found ${data.locations.length} locations from Google, ${newLocations.length} are new`);

        if (newLocations.length > 0) {
          // Only save new locations
          const locationsToSave = newLocations.map((location: any) => ({
            user_id: user.id,
            google_place_id: location.google_place_id.replace(/^locations\//, ''), // Remove 'locations/' prefix
            name: location.name,
            address: location.address,
            phone: location.phone,
            website: location.website,
            rating: location.rating,
            total_reviews: location.total_reviews,
            latitude: location.latitude,
            longitude: location.longitude,
            status: location.status || 'active',
            last_fetched_at: new Date().toISOString(),
          }));

          const { error: saveError } = await supabase
            .from('user_locations')
            .insert(locationsToSave);

          if (saveError) {
            console.error('Error saving new locations to database:', saveError);
            toast({
              title: "Refresh Failed",
              description: "Failed to save new location data. Please try again.",
              variant: "destructive",
            });
            return;
          }

          console.log(`Saved ${locationsToSave.length} new locations to database`);
        }

        // Update existing locations with fresh data
        const updatePromises = data.locations
          .filter((location: any) => {
            const normalizedPlaceId = location.google_place_id.replace(/^locations\//, '');
            return existingPlaceIds.has(normalizedPlaceId);
          })
          .map(async (location: any) => {
            const normalizedPlaceId = location.google_place_id.replace(/^locations\//, '');
            const { error: updateError } = await supabase
              .from('user_locations')
              .update({
                name: location.name,
                address: location.address,
                phone: location.phone,
                website: location.website,
                rating: location.rating,
                total_reviews: location.total_reviews,
                latitude: location.latitude,
                longitude: location.longitude,
                status: location.status || 'active',
                last_fetched_at: new Date().toISOString(),
              })
              .eq('user_id', user.id)
              .eq('google_place_id', normalizedPlaceId);

            if (updateError) {
              console.error(`Error updating location ${location.name}:`, updateError);
            }
          });

        await Promise.all(updatePromises);

        // Reload locations from database
        await fetchLocations();
        
        const updatedCount = data.locations.length - newLocations.length;
        let message = "Location data has been updated from Google Business Profile";
        if (newLocations.length > 0 && updatedCount > 0) {
          message = `Added ${newLocations.length} new location(s) and updated ${updatedCount} existing location(s)`;
        } else if (newLocations.length > 0) {
          message = `Added ${newLocations.length} new location(s)`;
        } else if (updatedCount > 0) {
          message = `Updated ${updatedCount} existing location(s)`;
        }
        
        toast({
          title: "Locations Refreshed",
          description: message,
        });
      }
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

  const handleDeleteLocations = async () => {
    if (selectedLocations.length === 0) {
      toast({
        title: "No Locations Selected",
        description: "Please select locations to delete",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);
      
      // Delete selected locations from database
      const { error } = await supabase
        .from('user_locations')
        .delete()
        .in('id', selectedLocations);

      if (error) {
        console.error('Error deleting locations:', error);
        toast({
          title: "Delete Failed",
          description: "Failed to delete locations. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Remove deleted locations from state
      setLocations(prev => prev.filter(loc => !selectedLocations.includes(loc.id)));
      setSelectedLocations([]);
      
      toast({
        title: "Locations Deleted",
        description: `Successfully deleted ${selectedLocations.length} location(s)`,
      });
    } catch (error) {
      console.error('Error deleting locations:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete locations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId) 
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocations.length === locations.length) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(locations.map(loc => loc.id));
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchLocations(); // Load from database
      fetchBrands(); // Load brands for Enterprise users
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

      // For real users, fetch from database with brand information
      const { data: dbLocations, error: dbError } = await supabase
        .from('user_locations')
        .select(`
          *,
          brand_profiles!user_locations_brand_id_fkey (
            id,
            brand_name,
            logo_url,
            primary_color,
            secondary_color
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!dbError && dbLocations) {
        console.log(`Loaded ${dbLocations.length} locations from database`);
        // Transform the data to include brand information
        const locationsWithBrands = dbLocations.map((loc: any) => ({
          ...loc,
          brand_id: loc.brand_profiles?.id || null,
          brand_name: loc.brand_profiles?.brand_name || null,
        }));
        setLocations(locationsWithBrands);
      } else {
        console.error('Error loading locations from database:', dbError);
        setLocations([]);
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
                  {canUseReviewTemplates && brands.length > 0 && (
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.brand_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
              <>
                {/* Delete Controls */}
                {locations.length > 0 && (
                  <div className="flex items-center justify-between mb-6 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="select-all"
                          checked={selectedLocations.length === locations.length && locations.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor="select-all" className="text-sm font-medium">
                          Select All ({selectedLocations.length}/{locations.length})
                        </label>
                      </div>
                    </div>
                    {selectedLocations.length > 0 && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteLocations}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : `Delete ${selectedLocations.length} Location(s)`}
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations
                  .filter((l) => {
                    const q = searchTerm.trim().toLowerCase();
                    const matchesSearch = !q || (
                      l.name.toLowerCase().includes(q) ||
                      (l.address || '').toLowerCase().includes(q)
                    );
                    
                    const matchesBrand = selectedBrand === "all" || 
                      (selectedBrand === "unassigned" && !l.brand_id) ||
                      l.brand_id === selectedBrand;
                    
                    return matchesSearch && matchesBrand;
                  })
                  .map((location) => (
                  <Card key={location.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes(location.id)}
                            onChange={() => handleLocationSelect(location.id)}
                            className="mt-1 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <CardTitle className="text-lg">{location.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {location.address}
                            </CardDescription>
                          </div>
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
                        {canUseReviewTemplates && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 text-sm">
                              <Palette className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Brand:</span>
                              <span className="font-medium">
                                {location.brand_name || "Unassigned"}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                            onClick={() => {
                              setAssigningLocation(location);
                              setIsAssignDialogOpen(true);
                              // Refresh brands when opening dialog
                              fetchBrands();
                            }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
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
              </>
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

            {/* Brand Assignment Dialog */}
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Brand to Location</DialogTitle>
                  <DialogDescription>
                    Choose a brand profile for {assigningLocation?.name}
                    {brands.length === 0 && " (No brands available - create brands first)"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Brand</Label>
                    <Select
                      value={assigningLocation?.brand_id || "none"}
                      onValueChange={(value) => {
                        if (assigningLocation) {
                          const brandId = value === "none" ? null : value;
                          handleAssignBrand(assigningLocation.id, brandId);
                          setIsAssignDialogOpen(false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Brand (Unassigned)</SelectItem>
                        {brands.length > 0 ? (
                          brands.map(brand => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.brand_name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-brands" disabled>
                            No brands available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Locations;
