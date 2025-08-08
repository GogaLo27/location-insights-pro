import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/ui/auth-provider';
import { supabase } from '@/integrations/supabase/client';

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
  setSelectedLocation: (location: SelectedLocation | null) => void;
  loading: boolean;
  refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [loading, setLoading] = useState(true);

  const getSessionTokens = async () => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      await supabase.auth.refreshSession();
      ({ data: { session } } = await supabase.auth.getSession());
    }
    return {
      supabaseJwt: session?.access_token || "",
      googleAccessToken: session?.provider_token || "",
    };
  };

  const refreshLocations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      
      if (!supabaseJwt || !googleAccessToken) {
        setLocations([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { action: 'fetch_user_locations' },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken,
        },
      });

      if (!error && data?.locations) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedLocation = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_selected_locations')
        .select('google_place_id, location_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setSelectedLocation(data);
      }
    } catch (error) {
      console.error('Error fetching selected location:', error);
    }
  };

  const updateSelectedLocation = async (location: SelectedLocation | null) => {
    if (!user || !location) return;

    try {
      const { error } = await supabase
        .from('user_selected_locations')
        .upsert({
          user_id: user.id,
          google_place_id: location.google_place_id,
          location_name: location.location_name,
        });

      if (!error) {
        setSelectedLocation(location);
      }
    } catch (error) {
      console.error('Error updating selected location:', error);
    }
  };

  useEffect(() => {
    if (user) {
      refreshLocations();
      fetchSelectedLocation();
    }
  }, [user]);

  return (
    <LocationContext.Provider
      value={{
        locations,
        selectedLocation,
        setSelectedLocation: updateSelectedLocation,
        loading,
        refreshLocations,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};