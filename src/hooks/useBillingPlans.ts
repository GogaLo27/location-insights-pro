import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface BillingPlan {
  id: string
  plan_type: string
  provider: string
  plan_name: string
  plan_description: string
  price_cents: number
  currency: string
  interval: string
  features: string[]
  is_active: boolean
  sort_order: number
  trial_days: number
  max_locations: number | null
  max_reviews_per_month: number | null
  support_level: string
  created_at: string
  updated_at: string
}

export function useBillingPlans(provider: 'paypal' | 'lemonsqueezy' = 'paypal') {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPlans()
  }, [provider])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('provider', provider)
        .order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching billing plans:', error)
        throw error
      }
      
      console.log('Fetched plans for provider', provider, ':', data)
      setPlans(data || [])
    } catch (err) {
      console.error('Error fetching billing plans:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch plans')
    } finally {
      setLoading(false)
    }
  }

  const getPlanByType = (planType: string) => {
    return plans.find(plan => plan.plan_type === planType)
  }

  const getRecommendedPlan = () => {
    return plans.find(plan => plan.plan_type === 'professional') || plans[0]
  }

  return {
    plans,
    loading,
    error,
    getPlanByType,
    getRecommendedPlan,
    refetch: fetchPlans
  }
}
