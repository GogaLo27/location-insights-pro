import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_EMAIL, mockLocations } from "@/utils/mockData";

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

interface LocationContextType {
  locations: Location[];
  selectedLocation: SelectedLocation | null;
  setSelectedLocation: (location: SelectedLocation | null) => Promise<void>;
  loading: boolean;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);
const DEMO_SELECTED_KEY = "lip_demo_selected_location";

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) throw new Error("useLocation must be used within a LocationProvider");
  return context;
};

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocationState] = useState<SelectedLocation | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLocations = async () => {
    if (!user) return;

    // DEMO: return mock locations
    if (user.email === DEMO_EMAIL) {
      setLocations(
        mockLocations.map((m) => ({
          id: m.id,
          google_place_id: m.google_place_id,
          name: m.name,
          address: m.address ?? null,
        })) as any
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      let googleAccessToken = session?.provider_token;
      if (!googleAccessToken) {
        await supabase.auth.refreshSession();
      }
      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: { action: "fetch_user_locations" },
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
          "X-Google-Token": googleAccessToken || "",
        },
      });
      if (!error && data?.locations) {
        setLocations(data.locations);
      } else {
        setLocations([]);
      }
    } catch (e) {
      console.error("Error fetching locations:", e);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedLocation = async () => {
    if (!user) return;

    // DEMO: restore from localStorage or pick first
    if (user.email === DEMO_EMAIL) {
      const saved = localStorage.getItem(DEMO_SELECTED_KEY);
      if (saved) {
        setSelectedLocationState(JSON.parse(saved));
      } else if (mockLocations.length > 0) {
        setSelectedLocationState({
          google_place_id: mockLocations[0].google_place_id,
          location_name: mockLocations[0].name,
        });
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_selected_locations")
        .select("google_place_id, location_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data) setSelectedLocationState(data as any);
    } catch (e) {
      console.error("Error fetching selected location:", e);
    }
  };

  const setSelectedLocation = async (location: SelectedLocation | null) => {
    if (!user || !location) return;

    // DEMO: persist locally
    if (user.email === DEMO_EMAIL) {
      setSelectedLocationState(location);
      localStorage.setItem(DEMO_SELECTED_KEY, JSON.stringify(location));
      return;
    }

    try {
      const { error } = await supabase
        .from("user_selected_locations")
        .upsert(
          {
            user_id: user.id,
            google_place_id: location.google_place_id,
            location_name: location.location_name,
          },
          { onConflict: "user_id" }
        );
      if (!error) setSelectedLocationState(location);
      else console.error("Error updating selected location:", error);
    } catch (e) {
      console.error("Error updating selected location:", e);
    }
  };

  useEffect(() => {
    if (user) {
      refreshLocations();
      fetchSelectedLocation();
    } else {
      setLocations([]);
      setSelectedLocationState(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  return (
    <LocationContext.Provider
      value={{ locations, selectedLocation, setSelectedLocation, loading, refreshLocations }}
    >
      {children}
    </LocationContext.Provider>
  );
};
