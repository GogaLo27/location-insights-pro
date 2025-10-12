import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_EMAIL, mockUserPlan } from "@/utils/mockData";

interface UserPlan {
  id: string;
  plan_type: string;
  created_at: string;
  subscription_status?: 'active' | 'cancelled' | 'expired';
  current_period_end?: string | null;
}

export const usePlan = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);

  useEffect(() => {
    if (!user) {
      setPlan(null);
      // DON'T set loading to false here - keep it true to prevent race condition
      return;
    }
    
    // CRITICAL: Set loading to true immediately when user is detected
    // This prevents race condition with ProtectedRoute
    setLoading(true);
    
    if (user.email === DEMO_EMAIL) {
      // Always give demo a plan so route guards pass
      setPlan({
        id: mockUserPlan.id,
        plan_type: mockUserPlan.plan_type,
        created_at: mockUserPlan.created_at,
      });
      setLoading(false);
      return;
    }
    
    // For real users, fetch the plan
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  const fetchPlan = async () => {
    if (!user) return;
    try {
      // Don't set loading here - it's already set in useEffect
      
      const { data, error } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching plan:", error);
        setPlan(null);
        setIsSubscriptionExpired(false);
      } else if (data) {
        // Also fetch subscription status to check expiration
        const { data: subscriptionData } = await supabase
          .from("subscriptions")
          .select("status, current_period_end")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let expired = false;
        if (subscriptionData) {
          // Check if subscription is expired
          if (subscriptionData.status === 'expired') {
            expired = true;
          } else if (subscriptionData.status === 'active' && subscriptionData.current_period_end) {
            const expiryDate = new Date(subscriptionData.current_period_end);
            const now = new Date();
            expired = expiryDate < now;
          }

          setPlan({
            ...data,
            subscription_status: subscriptionData.status as any,
            current_period_end: subscriptionData.current_period_end,
          } as any);
        } else {
          setPlan(data as any);
        }

        setIsSubscriptionExpired(expired);
      } else {
        // Don't auto-create a plan - let user choose
        setPlan(null);
        setIsSubscriptionExpired(false);
      }
    } catch (err) {
      console.error("Error fetching plan:", err);
      setPlan(null);
      setIsSubscriptionExpired(false);
    } finally {
      setLoading(false);
    }
  };

  return { plan, loading, refetch: fetchPlan, isSubscriptionExpired };
};
