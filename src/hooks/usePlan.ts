import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { supabase } from "@/integrations/supabase/client";

interface UserPlan {
  id: string;
  plan_type: string;
  created_at: string;
}

export const usePlan = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan(null);
      // DON'T set loading to false here - keep it true to prevent race condition
      return;
    }
    
    // CRITICAL: Set loading to true immediately when user is detected
    // This prevents race condition with ProtectedRoute
    setLoading(true);
    
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
      } else if (data) {
        setPlan(data as any);
      } else {
        // Don't auto-create a plan - let user choose
        setPlan(null);
      }
    } catch (err) {
      console.error("Error fetching plan:", err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  return { plan, loading, refetch: fetchPlan };
};
