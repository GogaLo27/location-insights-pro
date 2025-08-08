import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MapPin, Search, RefreshCw, Star, Phone, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
      let { data: { session } } = await supabase.auth.getSession();
      let googleAccessToken = session?.provider_token;

      if (!googleAccessToken) {
        console.log('No provider_token found, refreshing session...');
        await supabase.auth.refreshSession();
        const refreshedSession = await supabase.auth.getSession();
        session = refreshedSession.data.session;
        googleAccessToken = session?.provider_token;
      }

      console.log('Google access token available:', !!googleAccessToken);

      if (!googleAccessToken) {
        toast({
          title: "Authentication Required",
          description: "Please sign out and sign in with Google again to access your business data",
          variant: "destructive",
        });
        setLocations([]);
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'get_user_locations',
          googleAccessToken // ✅ send in body now
        }
      });

      if (error) {
        console.log('Error fetching locations:', error);
        setLocations([]);
      } else {
        console.log('Successfully fetched locations:', data?.locations?.length || 0);
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
      const { data: { session } } = await supabase.auth.getSession();
      const googleAccessToken = session?.provider_token;

      if (!googleAccessToken) {
        toast({
          title: "Error",
          description: "Please sign in with Google to access your business data",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_user_locations',
          googleAccessToken
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
      const { data: { session } } = await supabase.auth.getSession();
      const googleAccessToken = session?.provider_token;

      if (!googleAccessToken) {
        toast({
          title: "Error",
          description: "Please sign in with Google to access your business data",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'search_locations',
          query: searchTerm,
          googleAccessToken
        }
      });

      if (error) throw error;

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

          {/* rest of your JSX remains exactly the same */}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Locations;
