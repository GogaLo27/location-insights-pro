import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, Star, Filter, RefreshCw, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "@/contexts/LocationContext";
import ReplyDialog from "@/components/ReplyDialog";

interface Review {
  id: string;
  google_review_id: string;
  author_name: string;
  rating: number;
  text: string | null;
  review_date: string;
  reply_text: string | null;
  reply_date: string | null;
  ai_sentiment: "positive" | "negative" | "neutral" | null;
  ai_tags: string[] | null;
}

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = useLocation();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  useEffect(() => {
    if (user && selectedLocation) {
      fetchReviews();
    }
  }, [user, selectedLocation]);

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

  // ✅ robustly resolve the ID Google v4 expects
  const resolveLocationId = () => {
    if (!selectedLocation) return null as string | null;
    // prefer canonical id if present
    // @ts-ignore different shapes depending on where it came from
    const directId = selectedLocation.id || selectedLocation.location_id;
    if (directId) return String(directId);
    // fallback to parsing the BI resource name
    // @ts-ignore
    const gp: string | undefined = selectedLocation.google_place_id;
    if (!gp) return null;
    const tail = gp.split("/").pop();
    return tail || gp;
  };

  const fetchReviews = async () => {
    const locationId = resolveLocationId();
    if (!locationId) return;

    setLoading(true);
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const { data, error } = await supabase.functions.invoke("google-business-api", {
        body: {
          action: "fetch_reviews",
          locationId, // ✅ now always the trailing id string Google v4 expects
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) throw error;

      const reviewsData = (data?.reviews || []) as Review[];
      setReviews(reviewsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive",
      });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "text-success border-success";
      case "negative": return "text-destructive border-destructive";
      case "neutral": return "text-muted-foreground border-muted-foreground";
      default: return "text-muted-foreground border-muted-foreground";
    }
  };

  const getSentimentBg = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "bg-success/10";
      case "negative": return "bg-destructive/10";
      case "neutral": return "bg-muted/50";
      default: return "bg-muted/50";
    }
  };

  const allTags = Array.from(new Set(reviews.flatMap(review => review.ai_tags || [])));

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchTerm ||
      review.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.author_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSentiment =
      sentimentFilter === "all" || review.ai_sentiment === sentimentFilter;

    const matchesRating =
      ratingFilter === "all" || String(review.rating) === ratingFilter;

    const matchesTag =
      tagFilter === "all" || (review.ai_tags && review.ai_tags.includes(tagFilter));

    return matchesSearch && matchesSentiment && matchesRating && matchesTag;
  });

  const getAverageRating = () =>
    reviews.length === 0 ? 0 : (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1);

  const getSentimentCounts = () => {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    reviews.forEach(r => { if (r.ai_sentiment) counts[r.ai_sentiment]++; });
    return counts;
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading reviews...</p>
        </div>
      </div>
    );
  }

  const sentimentCounts = getSentimentCounts();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          {/* --- your UI below is unchanged --- */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-4">
              <h1 className="text-xl font-semibold">Reviews</h1>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              <Button onClick={fetchReviews} size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </header>
          
          <div className="flex-1 space-y-6 p-8 pt-6">
            {/* ...rest of your JSX exactly as you posted... */}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;
