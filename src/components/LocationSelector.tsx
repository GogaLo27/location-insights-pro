import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Location {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
}

interface SelectedLocation {
  google_place_id: string;
  location_name: string;
}

const LocationSelector = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLocations();
      fetchSelectedLocation();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const googleAccessToken = session?.provider_token;
      
      if (!googleAccessToken) {
        setLocations([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { action: 'get_user_locations' },
        headers: { 'X-Google-Token': googleAccessToken }
      });

      if (!error && data?.locations) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchSelectedLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('user_selected_locations')
        .select('google_place_id, location_name')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!error && data) {
        setSelectedLocation(data);
      }
    } catch (error) {
      console.error('Error fetching selected location:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = async (location: Location) => {
    try {
      const { error } = await supabase
        .from('user_selected_locations')
        .upsert({
          user_id: user?.id,
          google_place_id: location.google_place_id,
          location_name: location.name,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save selected location",
          variant: "destructive",
        });
        return;
      }

      setSelectedLocation({
        google_place_id: location.google_place_id,
        location_name: location.name,
      });

      toast({
        title: "Success",
        description: `Selected ${location.name}`,
      });
    } catch (error) {
      console.error('Error selecting location:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <MapPin className="w-4 h-4" />
        <span>Loading...</span>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>No locations</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2">
          <MapPin className="w-4 h-4" />
          <span className="max-w-[200px] truncate">
            {selectedLocation?.location_name || "Select Location"}
          </span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        {locations.map((location) => (
          <DropdownMenuItem
            key={location.id}
            onClick={() => selectLocation(location)}
            className="flex flex-col items-start space-y-1"
          >
            <span className="font-medium">{location.name}</span>
            {location.address && (
              <span className="text-sm text-muted-foreground truncate w-full">
                {location.address}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LocationSelector;