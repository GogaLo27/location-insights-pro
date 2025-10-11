import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, Star, Filter, RefreshCw, MessageSquare, Bot, Loader2, Trash2, CheckSquare, Square, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "@/contexts/LocationContext";
import { useAnalysisProgress } from "@/hooks/useAnalysisProgress";
import ReplyDialog from "@/components/ReplyDialog";
import LocationSelector from "@/components/LocationSelector";
import { SyncButton } from "@/components/SyncButton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { FeatureGate } from "@/components/UpgradePrompt";

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
  location_id: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  ai_analyzed_at?: string | null;
}

const Reviews = () => {
  const { user, loading: authLoading } = useAuth();
  const { selectedLocation } = useLocation();
  const { toast } = useToast();
  const { canUseAIAnalysis, canUseAIReplyGeneration, canBulkOperate, canBulkAnalyze, canBulkReply, planType, isProfessional, isEnterprise } = usePlanFeatures();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [totalReviews, setTotalReviews] = useState(0);
  const [allReviewsLoaded, setAllReviewsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [reviewsDeleted, setReviewsDeleted] = useState(false);
  
  // Bulk operations state
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  const [isBulkReplying, setIsBulkReplying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  
  // Check if reviews were deleted for this location
  const getDeletedFlag = () => {
    const locationId = resolveLocationId();
    if (!locationId) return false;
    return localStorage.getItem(`reviews_deleted_${userKey}_${locationId}`) === 'true';
  };
  
  const setDeletedFlag = (deleted: boolean) => {
    const locationId = resolveLocationId();
    if (!locationId) return;
    if (deleted) {
      localStorage.setItem(`reviews_deleted_${userKey}_${locationId}`, 'true');
    } else {
      localStorage.removeItem(`reviews_deleted_${userKey}_${locationId}`);
    }
  };
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const userKey = user?.id || 'anon';
  const locKey = (() => {
    const sl: any = selectedLocation;
    if (!sl) return 'none';
    const direct = sl?.id || sl?.location_id;
    if (direct) return String(direct);
    const gp: string | undefined = sl?.google_place_id;
    const tail = gp ? gp.split('/').pop() : '';
    return tail || 'none';
  })();

  const {
    isAnalyzing,
    progress,
    total,
    completed,
    startProgress,
    updateProgress,
    finishProgress,
    resetProgress
  } = useAnalysisProgress(`analysis_${userKey}_${locKey}`);

  const {
    isAnalyzing: isFetching,
    progress: fetchProgressValue,
    total: fetchTotal,
    completed: fetchCompleted,
    startProgress: startFetch,
    updateProgress: updateFetch,
    finishProgress: finishFetch,
    resetProgress: resetFetchProgress
  } = useAnalysisProgress(`fetch_${userKey}_${locKey}`);

  // Auto-reset stuck progress states
  useEffect(() => {
    if (isFetching && fetchProgressValue >= 100) {
      console.log('Auto-resetting stuck progress state');
      resetFetchProgress();
    }
  }, [isFetching, fetchProgressValue, resetFetchProgress]);

  useEffect(() => {
    console.log('useEffect triggered:', {
      user: !!user,
      selectedLocation: !!selectedLocation,
      reviewsLength: reviews.length,
      reviewsDeleted
    });

    // Only reset and fetch if we have a valid location and user
    if (user && selectedLocation) {
      // Check if this is actually a location change, not just re-initialization
      const currentLocationId = resolveLocationId();
      const lastLocationId = localStorage.getItem(`last_location_${userKey}`);
      
      console.log('Location check:', {
        currentLocationId,
        lastLocationId,
        isLocationChange: currentLocationId !== lastLocationId
      });
      
      if (currentLocationId && currentLocationId !== lastLocationId) {
        // This is a real location change - reset everything
        console.log('Location changed - resetting everything');
        resetProgress();
        resetFetchProgress();
        setReviews([]);
        setPage(1);
        setTotalReviews(0);
        setAllReviewsLoaded(false);
        setReviewsDeleted(false); // Reset deletion flag on location change
        setDeletedFlag(false); // Clear localStorage deletion flag for new location
        localStorage.setItem(`last_location_${userKey}`, currentLocationId);
        fetchReviews(false); // Load cached reviews quickly
      } else if (currentLocationId && currentLocationId === lastLocationId && reviews.length === 0 && !getDeletedFlag()) {
        // Same location but no reviews loaded yet - just fetch without resetting (but not if deleted)
        console.log('Same location, no reviews, not deleted - fetching');
        fetchReviews(false);
      } else {
        console.log('No fetch needed:', {
          currentLocationId: !!currentLocationId,
          lastLocationId: !!lastLocationId,
          reviewsLength: reviews.length,
          reviewsDeleted
        });
      }
    } else if (!user || !selectedLocation) {
      // Clear state when user or location is not available
      console.log('Clearing state - no user or location');
      resetProgress();
      resetFetchProgress();
      setReviews([]);
      setTotalReviews(0);
      setAllReviewsLoaded(false);
      setReviewsDeleted(false); // Reset deletion flag when clearing state
    }
  }, [user, selectedLocation]);

  // Handle page visibility changes to prevent unnecessary re-fetching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && selectedLocation && reviews.length > 0) {
        // Page became visible and we already have reviews - don't refetch
        // This prevents the flash of 0 values when switching back to the tab
        return;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, selectedLocation, reviews.length]);

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

  const fetchReviews = async (forceRefresh = false) => {
    const locationId = resolveLocationId();
    if (!locationId) return;

    // Validate and reset progress state if it's in an inconsistent state
    if (isFetching && fetchProgressValue >= 100) {
      console.log('Detected stuck progress state, resetting...');
      resetFetchProgress();
    }
    
    // Also reset if we're not actually fetching but the state says we are
    if (isFetching && !forceRefresh) {
      console.log('Detected inconsistent isFetching state, resetting...');
      resetFetchProgress();
    }

    if (forceRefresh) {
      setLoading(true);
      startFetch();
    }

    try {
      // Check if demo user and use mock data
      if (user.email === 'demolip29@gmail.com') {
        const { getDemoReviewsForLocation, mockLocations } = await import('@/utils/mockData');
        let filteredReviews: any[] = [];

        if (locationId && locationId !== 'all' && selectedLocation) {
          // Map the selected demo location's google_place_id to its mock id
          // selectedLocation only has google_place_id + location_name in demo
          const demoPlaceId: string | undefined = (selectedLocation as any).google_place_id;
          const match = demoPlaceId ? mockLocations.find(l => l.google_place_id === demoPlaceId) : undefined;
          const demoLocationId = match?.id;
          if (demoLocationId) {
            filteredReviews = getDemoReviewsForLocation(demoLocationId);
          }
        }

        setReviews(filteredReviews.map(review => ({
          ...review,
          ai_sentiment: review.ai_sentiment as "positive" | "negative" | "neutral" | null
        })));
        updateFetch(filteredReviews.length, filteredReviews.length);
        finishFetch();
        return;
      }

      // First, get the total count of reviews for this location
      const { count: totalCount, error: countError } = await supabase
        .from('saved_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId);

      if (!countError && totalCount !== null) {
        setTotalReviews(totalCount);
      }

      // Load all saved reviews from database for instant display
      const { data: savedReviews, error: dbError } = await supabase
        .from('saved_reviews')
        .select('*')
        .eq('location_id', locationId)
        .order('review_date', { ascending: false });

      if (!dbError && savedReviews) {
        setReviews(savedReviews.map(review => ({
          ...review,
          ai_sentiment: review.ai_sentiment as "positive" | "negative" | "neutral" | null
        })));
        setAllReviewsLoaded(true);
      }

      // Only fetch from Google if forcing refresh or no saved reviews (but not if reviews were intentionally deleted)
      const shouldFetchFromGoogle = forceRefresh || ((!savedReviews || savedReviews.length === 0) && !reviewsDeleted && !getDeletedFlag());
      
      console.log('Fetch decision:', {
        forceRefresh,
        savedReviewsCount: savedReviews?.length || 0,
        reviewsDeleted,
        shouldFetchFromGoogle
      });

      if (shouldFetchFromGoogle) {
        const { supabaseJwt, googleAccessToken } = await getSessionTokens();
        if (!supabaseJwt || !googleAccessToken) {
          console.warn("Missing tokens - using cached reviews");
          return;
        }

        console.log('🚨 CALLING GOOGLE API TO FETCH REVIEWS 🚨', {
          locationId,
          forceRefresh,
          reviewsDeleted,
          savedReviewsCount: savedReviews?.length || 0
        });
        console.trace('Stack trace of Google API call:');

        const { data, error } = await supabase.functions.invoke("google-business-api", {
          body: {
            action: "fetch_reviews",
            locationId,
          },
          headers: {
            Authorization: `Bearer ${supabaseJwt}`,
            "X-Google-Token": googleAccessToken,
          },
        });

        if (!error && data?.reviews) {
          const googleReviews = data.reviews.map((review: any) => ({
            ...review,
            location_id: locationId
          }));

          await saveReviewsToDatabase(googleReviews, locationId, (processed, total) => {
            updateFetch(processed, total);
          });

          // Get updated reviews from database and update total count
          const { data: updatedReviews, count: updatedCount } = await supabase
            .from('saved_reviews')
            .select('*', { count: 'exact' })
            .eq('location_id', locationId)
            .order('review_date', { ascending: false });

          if (updatedReviews) {
            setReviews(updatedReviews.map(review => ({
              ...review,
              ai_sentiment: review.ai_sentiment as "positive" | "negative" | "neutral" | null
            })));
            if (updatedCount !== null) {
              setTotalReviews(updatedCount);
            }
            setAllReviewsLoaded(true);
          }
        }
      }

    } catch (error) {
      console.error("Error fetching reviews:", error);
      
      // Always reset progress state on error to prevent stuck progress bar
      resetFetchProgress();
      
      if (forceRefresh) {
        toast({
          title: "Error",
          description: "Failed to refresh reviews",
          variant: "destructive",
        });
      }
    } finally {
      if (forceRefresh) {
        setLoading(false);
        // Only finish if we're not already reset (to avoid double state changes)
        if (fetchProgressValue > 0) {
          finishFetch();
        }
      }
    }
  };

  const saveReviewsToDatabase = async (
  googleReviews: any[],
  locationId: string,
  onProgress?: (processed: number, total: number) => void
) => {
  if (!user) return;

  const total = googleReviews.length;
  onProgress?.(0, total);

  try {

  // Fetch existing rows for comparison, not just IDs
  const { data: existingRows, error: existingErr } = await supabase
    .from("saved_reviews")
    .select("google_review_id, text, reply_text, reply_date")
    .eq("user_id", user.id)
    .eq("location_id", locationId);

  if (existingErr) {
    console.error("Error fetching existing reviews:", existingErr);
  }

  const existingMap = new Map<string, { text: string | null; reply_text: string | null; reply_date: string | null }>();
  (existingRows || []).forEach((r: any) => {
    existingMap.set(r.google_review_id, {
      text: r.text,
      reply_text: r.reply_text,
      reply_date: r.reply_date,
    });
  });

  const newRecords: any[] = [];
  let processed = 0;

  for (const review of googleReviews) {
    processed += 1;
    onProgress?.(processed, total);

    const existing = existingMap.get(review.google_review_id);

    if (!existing) {
      // Insert new
      newRecords.push({
        user_id: user.id,
        google_review_id: review.google_review_id,
        location_id: locationId,
        author_name: review.author_name,
        rating: review.rating,
        text: review.text,
        review_date: review.review_date,
        reply_text: review.reply_text,
        reply_date: review.reply_date,
      });
      continue;
    }

    // UPDATE if existing.text is empty but Google has text, or reply info changed
    const needText = (!existing.text || !existing.text.trim()) && (review.text && review.text.trim());
    const needReply =
      (review.reply_text && review.reply_text !== existing.reply_text) ||
      (review.reply_date && review.reply_date !== existing.reply_date);

    if (needText || needReply) {
      const updates: any = {};
      if (needText) updates.text = review.text;
      if (needReply) {
        updates.reply_text = review.reply_text || null;
        updates.reply_date = review.reply_date || null;
      }

      const { error: updErr } = await supabase
        .from("saved_reviews")
        .update(updates)
        .eq("google_review_id", review.google_review_id)
        .eq("location_id", locationId);

      if (updErr) console.error("Update error:", updErr);
    }
  }

    // Batch insert new rows
    const chunkSize = 100;
    for (let i = 0; i < newRecords.length; i += chunkSize) {
      const chunk = newRecords.slice(i, i + chunkSize);
      const { error } = await supabase.from("saved_reviews").insert(chunk);
      if (error) {
        console.error("Insert error for chunk:", error);
        throw error; // Re-throw to trigger error handling
      }
    }
  } catch (error) {
    console.error("Error in saveReviewsToDatabase:", error);
    // Reset progress to prevent stuck progress bar
    onProgress?.(0, total);
    throw error; // Re-throw to let caller handle the error
  }
};

  const runAIAnalysis = async () => {
    if (!user || isAnalyzing) return;

    try {
      startProgress();

      // Get reviews that haven't been analyzed yet
      const { data: unanalyzedReviews } = await supabase
        .from('saved_reviews')
        .select('*')
        .eq('location_id', resolveLocationId())
        .is('ai_analyzed_at', null);

      if (!unanalyzedReviews || unanalyzedReviews.length === 0) {
        toast({
          title: "Info",
          description: "All reviews are already analyzed",
        });
        finishProgress();
        return;
      }

      updateProgress(0, unanalyzedReviews.length);

      // Process reviews in batches for better UX
      const batchSize = 10;
      let processedCount = 0;

      for (let i = 0; i < unanalyzedReviews.length; i += batchSize) {
        const batch = unanalyzedReviews.slice(i, i + batchSize);

        const { supabaseJwt } = await getSessionTokens();
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-review-analysis', {
          body: { reviews: batch },
          headers: {
            Authorization: `Bearer ${supabaseJwt}`,
          },
        });

        if (!analysisError && analysisData?.reviews) {
          // Update database with AI analysis
          for (const analyzedReview of analysisData.reviews) {
            await supabase
              .from('saved_reviews')
              .update({
                ai_sentiment: analyzedReview.ai_sentiment,
                ai_tags: analyzedReview.ai_tags,
                ai_issues: analyzedReview.ai_issues,
                ai_suggestions: analyzedReview.ai_suggestions,
                ai_analyzed_at: new Date().toISOString(),
              })
              .eq('google_review_id', analyzedReview.google_review_id);
          }

          processedCount += batch.length;
          updateProgress(processedCount, unanalyzedReviews.length);
        }
      }

      toast({
        title: "Success",
        description: `Analyzed ${processedCount} reviews`,
      });

      finishProgress();
      fetchReviews(false);
    } catch (error) {
      console.error('Error running AI analysis:', error);
      toast({
        title: "Error",
        description: "Failed to analyze reviews",
        variant: "destructive",
      });
      finishProgress();
    }
  };

  const deleteAllReviewsForLocation = async () => {
    if (!user || !selectedLocation || isDeleting) return;

    const locationId = resolveLocationId();
    if (!locationId) {
      console.error('No location ID resolved');
      toast({
        title: "Error",
        description: "Could not resolve location ID",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDeleting(true);

      console.log('Starting delete operation for:', {
        locationId,
        userId: user.id,
        selectedLocation
      });

      // First, let's check how many reviews we're about to delete
      const { count: reviewCount, error: countError } = await supabase
        .from('saved_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', locationId)
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error counting reviews:', countError);
        throw countError;
      }

      console.log(`Found ${reviewCount} reviews to delete`);

      if (reviewCount === 0) {
        toast({
          title: "Info",
          description: "No reviews found to delete for this location",
        });
        return;
      }

      // Delete all reviews for the selected location
      const { data: deletedData, error: deleteError } = await supabase
        .from('saved_reviews')
        .delete()
        .eq('location_id', locationId)
        .eq('user_id', user.id)
        .select(); // Add select to see what was deleted

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      console.log('Successfully deleted reviews:', deletedData);

      // Reset all state
      setReviews([]);
      setTotalReviews(0);
      setAllReviewsLoaded(false);
      setPage(1);
      setReviewsDeleted(true); // Mark that reviews were intentionally deleted
      setDeletedFlag(true); // Persist deletion flag in localStorage
      console.log('Reviews deleted - setting reviewsDeleted flag to true');
      
      // Reset progress states immediately (no timeout needed)
      resetProgress();
      resetFetchProgress();

      toast({
        title: "Success",
        description: `Successfully deleted ${reviewCount} reviews and all AI analysis data for this location`,
      });

    } catch (error) {
      console.error('Error deleting reviews:', error);
      toast({
        title: "Error",
        description: `Failed to delete reviews: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk operations functions
  const handleSelectReview = (reviewId: string) => {
    setSelectedReviews(prev => 
      prev.includes(reviewId) 
        ? prev.filter(id => id !== reviewId)
        : [...prev, reviewId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReviews.length === filteredReviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(filteredReviews.map(review => review.id));
    }
  };

  const bulkAnalyzeReviews = async () => {
    if (!user || selectedReviews.length === 0 || isBulkAnalyzing) return;

    try {
      setIsBulkAnalyzing(true);
      setBulkProgress(0);
      setBulkTotal(selectedReviews.length);

      const reviewsToAnalyze = reviews.filter(review => 
        selectedReviews.includes(review.id) && !review.ai_analyzed_at
      );

      if (reviewsToAnalyze.length === 0) {
        toast({
          title: "No Reviews to Analyze",
          description: "Selected reviews are already analyzed or have no text to analyze.",
        });
        return;
      }

      // Process reviews in batches
      const batchSize = 5;
      let processedCount = 0;

      for (let i = 0; i < reviewsToAnalyze.length; i += batchSize) {
        const batch = reviewsToAnalyze.slice(i, i + batchSize);

        const { supabaseJwt } = await getSessionTokens();
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-review-analysis', {
          body: { reviews: batch },
          headers: {
            Authorization: `Bearer ${supabaseJwt}`,
          },
        });

        if (!analysisError && analysisData?.reviews) {
          // Update database with AI analysis
          for (const analyzedReview of analysisData.reviews) {
            await supabase
              .from('saved_reviews')
              .update({
                ai_sentiment: analyzedReview.ai_sentiment,
                ai_tags: analyzedReview.ai_tags,
                ai_issues: analyzedReview.ai_issues,
                ai_suggestions: analyzedReview.ai_suggestions,
                ai_analyzed_at: new Date().toISOString(),
              })
              .eq('google_review_id', analyzedReview.google_review_id);
          }

          processedCount += batch.length;
          setBulkProgress(processedCount);
        }
      }

      toast({
        title: "Bulk Analysis Complete",
        description: `Successfully analyzed ${processedCount} reviews`,
      });

      setSelectedReviews([]);
      fetchReviews(false);
    } catch (error) {
      console.error('Error in bulk analysis:', error);
      toast({
        title: "Error",
        description: "Failed to analyze selected reviews",
        variant: "destructive",
      });
    } finally {
      setIsBulkAnalyzing(false);
      setBulkProgress(0);
      setBulkTotal(0);
    }
  };

  const bulkGenerateReplies = async () => {
    if (!user || selectedReviews.length === 0 || isBulkReplying) return;

    try {
      setIsBulkReplying(true);
      setBulkProgress(0);
      setBulkTotal(selectedReviews.length);

      const reviewsToReply = reviews.filter(review => 
        selectedReviews.includes(review.id) && !review.reply_text
      );

      if (reviewsToReply.length === 0) {
        toast({
          title: "No Reviews to Reply To",
          description: "Selected reviews already have replies or have no text to reply to.",
        });
        return;
      }

      let processedCount = 0;

      for (const review of reviewsToReply) {
        try {
          const prompt = `Generate a professional business response to this ${review.rating}-star review:

Review: "${review.text || 'No text provided'}"
Reviewer: ${review.author_name}
Rating: ${review.rating}/5 stars
Sentiment: ${review.ai_sentiment || 'neutral'}

Please write a thoughtful, professional response that:
- Thanks the customer for their feedback
- Addresses their specific concerns if it's a negative review
- Maintains a positive, professional tone
- Is concise but personal
- Reflects well on the business

Keep the response under 150 words.`;

          const { data, error } = await supabase.functions.invoke("generate-ai-reply", {
            body: { prompt },
          });

          if (!error && data?.reply) {
            // Store the generated reply (user can edit before sending)
            await supabase
              .from('saved_reviews')
              .update({
                reply_text: data.reply,
                reply_date: new Date().toISOString(),
              })
              .eq('id', review.id);

            processedCount++;
            setBulkProgress(processedCount);
          }
        } catch (error) {
          console.error(`Error generating reply for review ${review.id}:`, error);
        }
      }

      toast({
        title: "Bulk Reply Generation Complete",
        description: `Generated ${processedCount} AI replies. You can edit them before sending.`,
      });

      setSelectedReviews([]);
      fetchReviews(false);
    } catch (error) {
      console.error('Error in bulk reply generation:', error);
      toast({
        title: "Error",
        description: "Failed to generate replies for selected reviews",
        variant: "destructive",
      });
    } finally {
      setIsBulkReplying(false);
      setBulkProgress(0);
      setBulkTotal(0);
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

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const pagedReviews = filteredReviews.slice((page - 1) * pageSize, page * pageSize);
  
  // Performance optimization: limit displayed reviews for very large datasets
  const maxDisplayedReviews = 1000;
  const shouldShowPagination = filteredReviews.length > pageSize;
  const displayReviews = filteredReviews.length > maxDisplayedReviews 
    ? filteredReviews.slice(0, maxDisplayedReviews) 
    : filteredReviews;

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

  if (authLoading) {
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
              <LocationSelector />
              {/* Plan Indicator - for debugging */}
              <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'Starter'} Plan
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              {/* Sync New Reviews Button */}
              {resolveLocationId() && (
                <SyncButton 
                  locationId={resolveLocationId()} 
                  onSyncComplete={fetchReviews}
                  className="mr-2"
                />
              )}
              
              {/* Bulk Operations */}
              {selectedReviews.length > 0 && (
                <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1 rounded-lg">
                  <span className="text-sm font-medium">{selectedReviews.length} selected</span>
                  <FeatureGate feature="Bulk Operations" variant="inline">
                    <Button
                      onClick={bulkAnalyzeReviews}
                      size="sm"
                      variant="outline"
                      disabled={isBulkAnalyzing}
                    >
                      {isBulkAnalyzing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Bulk Analyze
                    </Button>
                  </FeatureGate>
                  <FeatureGate feature="Bulk Operations" variant="inline">
                    <Button
                      onClick={bulkGenerateReplies}
                      size="sm"
                      variant="outline"
                      disabled={isBulkReplying}
                    >
                      {isBulkReplying ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4 mr-2" />
                      )}
                      Bulk Reply
                    </Button>
                  </FeatureGate>
                  <Button
                    onClick={() => setSelectedReviews([])}
                    size="sm"
                    variant="ghost"
                  >
                    Clear
                  </Button>
                </div>
              )}
              
              {/* Bulk Operations Info */}
              {canBulkOperate && selectedReviews.length === 0 && reviews.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Select reviews to use bulk operations
                </div>
              )}
              
              <FeatureGate feature="AI Analysis" variant="inline">
                <Button
                  onClick={runAIAnalysis}
                  size="sm"
                  variant="outline"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="w-4 h-4 mr-2" />
                  )}
                  {isAnalyzing ? `Analyzing (${completed}/${total})` : 'AI Analysis'}
                </Button>
              </FeatureGate>
              <Button onClick={() => {
                setReviewsDeleted(false); // Reset deletion flag when manually refreshing
                setDeletedFlag(false); // Clear localStorage deletion flag
                fetchReviews(true);
              }} size="sm" disabled={isAnalyzing}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              {selectedLocation && reviews.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      disabled={isDeleting || isAnalyzing}
                      onClick={() => {
                        console.log('Delete button clicked');
                        console.log('Current state:', {
                          user: user?.id,
                          selectedLocation,
                          reviewsCount: reviews.length,
                          locationId: resolveLocationId()
                        });
                      }}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      {isDeleting ? 'Deleting...' : 'Delete All'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Reviews</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete ALL reviews and AI analysis data for <strong>{selectedLocation.location_name}</strong>?
                        <br /><br />
                        This action will permanently delete:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>All {totalReviews > 0 ? totalReviews : reviews.length} reviews for this location</li>
                          <li>All AI sentiment analysis data</li>
                          <li>All AI tags and suggestions</li>
                          <li>All review replies and metadata</li>
                        </ul>
                        <br />
                        <strong className="text-destructive">This action cannot be undone.</strong>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={deleteAllReviewsForLocation}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete All Reviews
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Fetch Progress Bar */}
            {(isFetching && fetchProgressValue < 100) && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Refreshing Reviews</span>
                      <span>{Math.round(fetchProgressValue)}%</span>
                    </div>
                    <Progress value={fetchProgressValue} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      {isFetching ? `Fetched ${fetchCompleted} of ${fetchTotal}…` : 'Refresh complete!'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stuck Progress Bar - Emergency Reset */}
            {(fetchProgressValue >= 100 && isFetching && allReviewsLoaded) && (
              <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200">Progress Bar Issue Detected</p>
                      <p className="text-sm text-orange-600 dark:text-orange-300">
                        The progress bar appears to be stuck or in an inconsistent state. Click reset to fix this.
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        console.log('Emergency progress reset triggered');
                        resetFetchProgress();
                        setLoading(false);
                        setIsDeleting(false);
                        setAllReviewsLoaded(true);
                        setReviewsDeleted(false);
                      }}
                    >
                      Reset Progress
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Analysis Progress Bar */}
            {(isAnalyzing || (progress > 0 && progress < 100)) && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>AI Analysis Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      {isAnalyzing ? `Processing review ${completed} of ${total}...` : 'Analysis complete!'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Operations Progress Bars */}
            {(isBulkAnalyzing || (bulkProgress > 0 && bulkProgress < bulkTotal)) && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Bulk Analysis Progress</span>
                      <span>{Math.round((bulkProgress / bulkTotal) * 100)}%</span>
                    </div>
                    <Progress value={(bulkProgress / bulkTotal) * 100} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      {isBulkAnalyzing ? `Analyzing ${bulkProgress} of ${bulkTotal} reviews...` : 'Bulk analysis complete!'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {(isBulkReplying || (bulkProgress > 0 && bulkProgress < bulkTotal)) && (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Bulk Reply Generation Progress</span>
                      <span>{Math.round((bulkProgress / bulkTotal) * 100)}%</span>
                    </div>
                    <Progress value={(bulkProgress / bulkTotal) * 100} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      {isBulkReplying ? `Generating replies for ${bulkProgress} of ${bulkTotal} reviews...` : 'Bulk reply generation complete!'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReviews > 0 ? totalReviews : reviews.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {allReviewsLoaded ? 'Total reviews' : 'Loaded reviews'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{getAverageRating()}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of 5 stars
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Positive</CardTitle>
                  <div className="h-4 w-4 bg-success rounded-full" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentimentCounts.positive}</div>
                  <p className="text-xs text-muted-foreground">
                    Positive reviews
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Negative</CardTitle>
                  <div className="h-4 w-4 bg-destructive rounded-full" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentimentCounts.negative}</div>
                  <p className="text-xs text-muted-foreground">
                    Negative reviews
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filter Reviews</CardTitle>
                <CardDescription>Filter reviews by search, sentiment, rating, and tags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search reviews..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sentiment</label>
                    <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sentiments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sentiments</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Ratings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ratings</SelectItem>
                        <SelectItem value="5">5 Stars</SelectItem>
                        <SelectItem value="4">4 Stars</SelectItem>
                        <SelectItem value="3">3 Stars</SelectItem>
                        <SelectItem value="2">2 Stars</SelectItem>
                        <SelectItem value="1">1 Star</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tags</label>
                    <Select value={tagFilter} onValueChange={setTagFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loading indicator for large datasets */}
            {loading && !allReviewsLoaded && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <div>
                      <p className="font-medium">Loading reviews...</p>
                      <p className="text-sm text-muted-foreground">
                        {totalReviews > 0 ? `Loading ${totalReviews} reviews` : 'Fetching review data'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
              {reviewsDeleted && reviews.length === 0 ? (
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Trash2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-medium mb-2 text-green-800 dark:text-green-200">Reviews Deleted</h3>
                    <p className="text-green-600 dark:text-green-300 mb-4">
                      All reviews and AI analysis data have been successfully deleted for this location.
                    </p>
                    <Button 
                      onClick={() => {
                        setReviewsDeleted(false);
                        setDeletedFlag(false);
                        fetchReviews(true);
                      }}
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Fetch Reviews Again
                    </Button>
                  </CardContent>
                </Card>
              ) : filteredReviews.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No reviews found</h3>
                    <p className="text-muted-foreground">
                      {reviews.length === 0
                        ? "No reviews available for this location."
                        : "Try adjusting your filters to see more reviews."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {filteredReviews.length > maxDisplayedReviews && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <MessageSquare className="w-4 h-4" />
                          <span>
                            Showing first {maxDisplayedReviews} of {filteredReviews.length} reviews for performance.
                            Use filters to narrow down results.
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Bulk Selection Header */}
                  {canBulkOperate && filteredReviews.length > 0 && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={handleSelectAll}
                              className="p-1 hover:bg-muted rounded-sm transition-colors"
                            >
                              {selectedReviews.length === filteredReviews.length ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <span className="text-sm font-medium">
                              {selectedReviews.length === filteredReviews.length 
                                ? "Deselect All" 
                                : "Select All"} ({filteredReviews.length} reviews)
                            </span>
                          </div>
                          {selectedReviews.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">
                                {selectedReviews.length} selected
                              </span>
                              <Button
                                onClick={() => setSelectedReviews([])}
                                size="sm"
                                variant="ghost"
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {pagedReviews.map((review) => (
                  <Card key={review.id} className={selectedReviews.includes(review.id) ? "ring-2 ring-primary" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          {/* Bulk Selection Checkbox */}
                          {canBulkOperate && (
                            <button
                              onClick={() => handleSelectReview(review.id)}
                              className="mt-1 p-1 hover:bg-muted rounded-sm transition-colors"
                            >
                              {selectedReviews.includes(review.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                          )}
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{review.author_name}</CardTitle>
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "text-yellow-400 fill-current"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(review.review_date), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {review.ai_sentiment && (
                            <Badge
                              variant="outline"
                              className={`${getSentimentColor(review.ai_sentiment)} ${getSentimentBg(review.ai_sentiment)}`}
                            >
                              {review.ai_sentiment}
                            </Badge>
                          )}
          {review.reply_text ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full"></div>
              <Badge variant="outline" className="text-success border-success bg-success/10 font-medium">
                ✓ Replied
              </Badge>
            </div>
          ) : (
            <ReplyDialog review={review} onReplySubmitted={() => fetchReviews(true)} />
          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {review.text && (
                        <p className="text-muted-foreground mb-4">{review.text}</p>
                      )}

                      {review.ai_tags && review.ai_tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {review.ai_tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {review.reply_text && (
                        <div className="bg-gradient-to-r from-success/5 to-success/10 border-l-4 border-success p-4 rounded-lg mt-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="w-2 h-2 bg-success rounded-full"></div>
                            <Badge variant="outline" className="text-success border-success bg-white font-medium">
                              Business Response
                            </Badge>
                            {review.reply_date && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {format(new Date(review.reply_date), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{review.reply_text}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  ))}
                </>
              )}
              {/* Pagination */}
              {shouldShowPagination && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {totalPages} — {filteredReviews.length} of {totalReviews > 0 ? totalReviews : reviews.length} reviews
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        Previous
                      </Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        Next
                      </Button>
                    </div>
                  </div>
                  
                  {/* Load More Button - loads next page inline */}
                  {page < totalPages && (
                    <div className="flex justify-center">
                      <Button 
                        variant="default" 
                        size="lg"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="w-full sm:w-auto"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Load More Reviews
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Reviews;
