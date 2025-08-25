import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_EMAIL, mockUserPlan } from "@/utils/mockData";

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
      setLoading(false);
      return;
    }
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
    fetchPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.email]);

  const fetchPlan = async () => {
    if (!user) return;
    try {
      setLoading(true);
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
      } else {
        setPlan(data as any);
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
