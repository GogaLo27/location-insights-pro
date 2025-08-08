import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MapPin, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";

interface Location {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
}

const LocationSelector = () => {
  const { toast } = useToast();
  const { locations, selectedLocation, setSelectedLocation, loading } = useLocation();

  const selectLocation = async (location: Location) => {
    try {
      await setSelectedLocation({
        google_place_id: location.google_place_id,
        location_name: location.name,
      });

      toast({
        title: "Success", 
        description: `Selected ${location.name}`,
      });
    } catch (error) {
      console.error('Error selecting location:', error);
      toast({
        title: "Error",
        description: "Failed to save selected location",
        variant: "destructive",
      });
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