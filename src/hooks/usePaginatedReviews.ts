import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import cache from '@/lib/redis';

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
  ai_analyzed_at?: string | null;
}

interface UsePaginatedReviewsOptions {
  locationId: string;
  pageSize?: number;
  sentimentFilter?: string;
  ratingFilter?: string;
  searchTerm?: string;
}

interface UsePaginatedReviewsReturn {
  reviews: Review[];
  loading: boolean;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
  loadMore: () => void;
  refresh: () => void;
  reset: () => void;
}

export function usePaginatedReviews({
  locationId,
  pageSize = 50,
  sentimentFilter = 'all',
  ratingFilter = 'all',
  searchTerm = '',
}: UsePaginatedReviewsOptions): UsePaginatedReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Build cache key
  const cacheKey = cache.keys.reviews(locationId, currentPage);

  // Fetch reviews with pagination
  const fetchReviews = useCallback(async (page: number, append: boolean = false) => {
    if (!locationId || loading) return;

    setLoading(true);

    try {
      // Try cache first (only if not appending)
      if (!append && cache.enabled) {
        const cachedData = await cache.get<{ reviews: Review[]; total: number }>(cacheKey);
        
        if (cachedData) {
          setReviews(cachedData.reviews);
          setTotalCount(cachedData.total);
          setHasMore(cachedData.reviews.length === pageSize);
          setLoading(false);
          return;
        }
      }

      // Build query
      let query = supabase
        .from('saved_reviews')
        .select('*', { count: 'exact' })
        .eq('location_id', locationId)
        .order('review_date', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Apply filters
      if (sentimentFilter !== 'all') {
        query = query.eq('ai_sentiment', sentimentFilter);
      }

      if (ratingFilter !== 'all') {
        query = query.eq('rating', parseInt(ratingFilter));
      }

      if (searchTerm) {
        query = query.or(`text.ilike.%${searchTerm}%,author_name.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const newReviews = (data || []) as Review[];

      // Update state
      if (append) {
        setReviews(prev => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      setTotalCount(count || 0);
      setHasMore(newReviews.length === pageSize);

      // Cache results (only if not appending)
      if (!append && cache.enabled) {
        await cache.set(cacheKey, { reviews: newReviews, total: count || 0 }, cache.ttl.reviews);
      }

    } catch (error) {
      console.error('Error fetching paginated reviews:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [locationId, currentPage, pageSize, sentimentFilter, ratingFilter, searchTerm, cacheKey]);

  // Load more (next page)
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchReviews(nextPage, true); // Append to existing reviews
  }, [currentPage, hasMore, loading, fetchReviews]);

  // Refresh current page
  const refresh = useCallback(async () => {
    // Invalidate cache
    await cache.invalidateLocation(locationId);
    
    // Reset and fetch first page
    setCurrentPage(0);
    setReviews([]);
    setHasMore(true);
    fetchReviews(0, false);
  }, [locationId, fetchReviews]);

  // Reset to first page
  const reset = useCallback(() => {
    setCurrentPage(0);
    setReviews([]);
    setHasMore(true);
    setTotalCount(0);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (locationId) {
      fetchReviews(0, false);
    }
  }, [locationId]); // Only refetch when locationId changes

  // Refetch when filters change
  useEffect(() => {
    if (locationId && currentPage === 0) {
      fetchReviews(0, false);
    }
  }, [sentimentFilter, ratingFilter, searchTerm]);

  return {
    reviews,
    loading,
    hasMore,
    totalCount,
    currentPage,
    loadMore,
    refresh,
    reset,
  };
}

