import { useState, useEffect } from 'react';
import { useAuth } from '@/components/ui/auth-provider';
import { supabase } from '@/integrations/supabase/client';

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
    if (user) {
      fetchPlan();
    } else {
      setPlan(null);
      setLoading(false);
    }
  }, [user]);

  const fetchPlan = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Check if demo user and use mock data
      if (user.email === 'demoLIP@gmail.com') {
        const { mockUserPlan } = await import('@/utils/mockData');
        setPlan(mockUserPlan);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching plan:', error);
        setPlan(null);
      } else {
        setPlan(data);
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  return { plan, loading, refetch: fetchPlan };
};