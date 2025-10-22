import { useState, useEffect } from 'react'
import { useAuth } from '@/components/ui/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { CreditCard, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface Subscription {
  id: string
  plan_type: string
  status: string
  provider_subscription_id: string | null
  created_at: string
  updated_at: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  can_refund: boolean | null
  refund_eligible_until: string | null
  cancelled_at: string | null
}

export default function SubscriptionManagement() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [refunding, setRefunding] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSubscription()
    }
  }, [user])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setSubscription(data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
      toast({
        title: 'Error',
        description: 'Failed to load subscription details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!subscription) return

    if (!confirm('Are you sure you want to cancel your subscription? This action cannot be undone.')) {
      return
    }

    try {
      setCancelling(true)
      const { data, error } = await supabase.functions.invoke('lemonsqueezy-cancel-subscription', {
        body: {
          subscription_id: subscription.id,
          reason: 'User requested cancellation'
        }
      })

      if (error) throw error

      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been cancelled successfully.',
      })

      fetchSubscription()
    } catch (error: any) {
      console.error('Error cancelling subscription:', error)
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleRefund = async () => {
    if (!subscription) return

    if (!confirm('Are you sure you want to request a refund? This will cancel your subscription and process a refund.')) {
      return
    }

    try {
      setRefunding(true)
      const { data, error } = await supabase.functions.invoke('lemonsqueezy-refund', {
        body: {
          subscription_id: subscription.id,
          refund_reason: 'User requested refund'
        }
      })

      if (error) throw error

      toast({
        title: 'Refund Processed',
        description: 'Your refund has been processed successfully.',
      })

      fetchSubscription()
    } catch (error: any) {
      console.error('Error processing refund:', error)
      toast({
        title: 'Refund Failed',
        description: error.message || 'Failed to process refund',
        variant: 'destructive',
      })
    } finally {
      setRefunding(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatPlanType = (planType: string) => {
    return planType.charAt(0).toUpperCase() + planType.slice(1)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isRefundEligible = () => {
    if (!subscription?.can_refund) return false
    if (!subscription?.refund_eligible_until) return false
    return new Date(subscription.refund_eligible_until) > new Date()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading subscription details...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            You don't have an active subscription. Choose a plan to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/plan-selection">Choose a Plan</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Subscription Management
          </CardTitle>
          <CardDescription>
            Manage your subscription and billing preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Plan</label>
              <p className="text-lg font-semibold">{formatPlanType(subscription.plan_type)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                {getStatusBadge(subscription.status)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Next Billing Date</label>
              <p className="text-lg">{formatDate(subscription.current_period_end)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Subscription ID</label>
              <p className="text-sm font-mono text-gray-600">{subscription.id}</p>
            </div>
          </div>

          {subscription.status === 'active' && (
            <div className="pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
                </Button>

                {isRefundEligible() && (
                  <Button
                    variant="outline"
                    onClick={handleRefund}
                    disabled={refunding}
                  >
                    {refunding ? 'Processing...' : 'Request Refund'}
                  </Button>
                )}
              </div>

              {isRefundEligible() && (
                <p className="text-sm text-gray-500 mt-2">
                  Refund eligible until: {formatDate(subscription.refund_eligible_until)}
                </p>
              )}
            </div>
          )}

          {subscription.status === 'cancelled' && subscription.cancelled_at && (
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                Cancelled on: {formatDate(subscription.cancelled_at)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}