import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Plus, RefreshCw, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Location {
  id: string;
  google_place_id: string;
  name: string;
  address: string;
  rating: number;
  total_reviews: number;
  status: string;
}

const Locations = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLocations();
    }
  }, [user]);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/functions/v1/google-business-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ action: 'fetch_locations' }),
      });

      const data = await response.json();
      if (response.ok) {
        setLocations(data.locations || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      setAddingLocation(true);
      const response = await fetch('/functions/v1/google-business-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({ 
          action: 'add_location',
          placeId: searchQuery 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setLocations([...locations, data.location]);
        setSearchQuery("");
        toast({
          title: "Success",
          description: "Location added successfully",
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: "Error",
        description: "Failed to add location",
        variant: "destructive",
      });
    } finally {
      setAddingLocation(false);
    }
  };

  if (!user) {
    window.location.href = '/';
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-semibold">Locations</h1>
          </div>
          <Button onClick={fetchLocations} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4">
        {/* Search and Add Location */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Add New Location</CardTitle>
            <CardDescription>
              Search for your Google Business location and add it to your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter Google Place ID or search for your business..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                />
              </div>
              <Button 
                onClick={addLocation} 
                disabled={!searchQuery.trim() || addingLocation}
              >
                {addingLocation ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add Location
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Locations List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Loading locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No locations found</h3>
              <p className="text-muted-foreground mb-6">
                Add your first Google Business location to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {locations.map((location) => (
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
                        <span className="font-medium">{location.rating}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {location.total_reviews} reviews
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="w-full">
                        View Reviews
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
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
    </div>
  );
};

export default Locations;