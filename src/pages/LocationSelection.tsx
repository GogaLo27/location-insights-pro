import { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/components/ui/auth-provider';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MapPin, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LocationSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    locations,
    selectedLocation,
    setSelectedLocation,
    loading,
    refreshLocations,
  } = useLocationContext();

  // Load locations if none are loaded
  useEffect(() => {
    if (locations.length === 0) {
      refreshLocations();
    }
  }, []);

  const handleSelect = async (loc: { google_place_id: string; name: string }) => {
    try {
      await setSelectedLocation({
        google_place_id: loc.google_place_id,
        location_name: loc.name,
      });
      toast({
        title: 'Location Selected',
        description: `You've selected ${loc.name} as your default location.`,
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Error selecting location:', err);
      toast({
        title: 'Error',
        description: 'Failed to save selected location.',
        variant: 'destructive',
      });
    }
  };

  // If not authenticated, redirect
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">Select a Location</h1>
          </header>
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                Choose Your Default Location
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Please select which Google Business location you want to use as
                your default. You can change this later from the location
                selector.
              </p>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mb-4"></div>
                <p className="text-muted-foreground">Loading locations…</p>
              </div>
            ) : locations.length === 0 ? (
              <Card className="mx-auto max-w-xl">
                <CardHeader>
                  <CardTitle>No Locations Found</CardTitle>
                  <CardDescription>
                    We couldn’t find any Google Business locations for your
                    account. Try refreshing or add a new location.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-4">
                  <Button onClick={refreshLocations} className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/locations')}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Manage Locations
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {locations.map((loc) => (
                  <Card key={loc.id} className="cursor-pointer hover:shadow-lg transition-all">
                    <CardHeader>
                      <CardTitle>{loc.name}</CardTitle>
                      {loc.address && (
                        <CardDescription className="truncate">{loc.address}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        variant={
                          selectedLocation?.google_place_id === loc.google_place_id
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() =>
                          handleSelect({
                            google_place_id: loc.google_place_id,
                            name: loc.name,
                          })
                        }
                      >
                        {selectedLocation?.google_place_id === loc.google_place_id
                          ? 'Selected'
                          : 'Select'}
                      </Button>
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

export default LocationSelection;
