import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "@/contexts/LocationContext";

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = useLocation();
  const { toast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const fetchReviews = async () => {
    if (!selectedLocation) {
      console.log('No location selected');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🚀 Starting review fetch for location:', selectedLocation.google_place_id);
      
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      
      if (!supabaseJwt || !googleAccessToken) {
        toast({
          title: "Authentication Required",
          description: "Please sign in with Google to access reviews",
          variant: "destructive",
        });
        return;
      }

      console.log('🔑 Tokens obtained, calling Google Business API...');

      const { data, error } = await supabase.functions.invoke('google-business-api', {
        body: { 
          action: 'fetch_reviews',
          locationId: selectedLocation.google_place_id
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          'X-Google-Token': googleAccessToken,
        },
      });

      console.log('📊 API Response:', { data, error });

      if (error) {
        console.error('❌ Error fetching reviews:', error);
        toast({
          title: "Error",
          description: `Failed to fetch reviews: ${error.message || 'Unknown error'}`,
          variant: "destructive",
        });
        return;
      }

      if (data?.reviews && Array.isArray(data.reviews)) {
        console.log('✅ Found reviews:', data.reviews.length);
        setReviews(data.reviews);
      } else {
        console.log('⚠️ No reviews in response');
        setReviews([]);
      }

    } catch (error) {
      console.error('💥 Catch block error:', error);
      toast({
        title: "Error",
        description: "Failed to load reviews. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 Effect triggered - User:', !!user, 'Location:', !!selectedLocation);
    if (user && selectedLocation) {
      fetchReviews();
    }
  }, [user, selectedLocation]);

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
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
            <div className="flex items-center space-x-4 ml-4">
              <LocationSelector />
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Customer Reviews</h1>
              <p className="text-muted-foreground text-lg">
                Debug version - check console for detailed logs
              </p>
            </div>

            {!selectedLocation ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Select a Location</h3>
                  <p className="text-muted-foreground text-center max-w-md">
                    Choose a location from the dropdown above to view reviews
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Debug Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p><strong>Selected Location:</strong> {selectedLocation.location_name}</p>
                      <p><strong>Google Place ID:</strong> {selectedLocation.google_place_id}</p>
                      <p><strong>User ID:</strong> {user?.id}</p>
                      <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                      <p><strong>Reviews Count:</strong> {reviews.length}</p>
                    </div>
                    <Button onClick={fetchReviews} className="mt-4" disabled={loading}>
                      {loading ? 'Loading...' : 'Fetch Reviews'}
                    </Button>
                  </CardContent>
                </Card>

                {loading ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p>Loading reviews...</p>
                    </CardContent>
                  </Card>
                ) : reviews.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 mx-auto" />
                      <h3 className="text-xl font-semibold mb-2">No Reviews Found</h3>
                      <p className="text-muted-foreground">
                        No reviews found for this location. Check console logs for details.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Reviews ({reviews.length})</h2>
                    {reviews.map((review: any, index) => (
                      <Card key={index}>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold">{review.author_name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className={i < review.rating ? "text-yellow-400" : "text-gray-300"}>★</span>
                                  ))}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {review.review_date}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {review.text && (
                            <p className="text-foreground mb-4">{review.text}</p>
                          )}
                          
                          {review.reply_text && (
                            <div className="mt-4 p-4 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-sm">Business Response</span>
                              </div>
                              <p className="text-sm">{review.reply_text}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;