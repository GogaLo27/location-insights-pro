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
      } else if (data) {
        setPlan(data as any);
      } else {
        // Auto-create a starter plan if none exists
        try {
          const { data: newPlan, error: createError } = await supabase
            .from('user_plans')
            .insert({
              user_id: user.id,
              plan_type: 'starter',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
            
          if (createError) {
            console.error('Error creating plan:', createError);
            setPlan(null);
          } else {
            setPlan(newPlan as any);
          }
        } catch (createErr) {
          console.error('Error creating plan:', createErr);
          setPlan(null);
        }
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
