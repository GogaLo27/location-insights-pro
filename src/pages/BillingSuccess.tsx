import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/ui/auth-provider'
import { supabase } from '@/integrations/supabase/client'
import { PageOrbs, fancyCardClass } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function BillingSuccess() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('Processing your subscription...')

  useEffect(() => {
    const processSubscription = async () => {
      try {
        // Get the latest subscription
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          console.error('Error fetching subscription:', error)
          setMessage('There was an issue processing your subscription. Please contact support.')
          return
        }

        // Check subscription status based on provider
        if (subscription?.status === 'active') {
          // Already active - redirect to dashboard
          setMessage('Subscription activated successfully! Redirecting to dashboard...')
          setTimeout(() => {
            navigate('/dashboard')
          }, 2000)
          return
        }

        if (subscription?.provider === 'keepz' || subscription?.keepz_order_id) {
          // Keepz subscription - wait for webhook to update status
          if (subscription?.status === 'pending') {
            setMessage('Subscription is being processed. This may take a few moments...')
            // Poll for status update
            const checkStatus = setInterval(async () => {
              const { data: updated } = await supabase
                .from('subscriptions')
                .select('status')
                .eq('id', subscription.id)
                .single()
              
              if (updated?.status === 'active') {
                clearInterval(checkStatus)
                setMessage('Subscription activated successfully! Redirecting to dashboard...')
                setTimeout(() => {
                  navigate('/dashboard')
                }, 2000)
              }
            }, 3000) // Check every 3 seconds

            // Stop checking after 2 minutes
            setTimeout(() => {
              clearInterval(checkStatus)
              setMessage('Subscription is still processing. Please check your dashboard or contact support.')
            }, 120000)
          }
        } else if (subscription?.paypal_subscription_id) {
          // PayPal subscription - check status directly
          const { data: paypalStatus, error: paypalError } = await supabase.functions.invoke('check-paypal-subscription', {
            body: {
              subscription_id: subscription.paypal_subscription_id
            }
          })

          if (paypalError) {
            console.error('Error checking PayPal subscription:', paypalError)
            setMessage('Subscription is being processed. This may take a few minutes...')
            setTimeout(() => {
              window.location.reload()
            }, 10000)
            return
          }

          if (paypalStatus?.status === 'ACTIVE') {
            // Update our database
            const { error: updateError } = await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                current_period_end: paypalStatus.billing_info?.next_billing_time 
                  ? new Date(paypalStatus.billing_info.next_billing_time).toISOString()
                  : null,
                updated_at: new Date().toISOString()
              })
              .eq('id', subscription.id)

            if (updateError) {
              console.error('Error updating subscription:', updateError)
            }

            setMessage('Subscription activated successfully! Redirecting to dashboard...')
            setTimeout(() => {
              navigate('/dashboard')
            }, 2000)
          } else {
            setMessage('Subscription is being processed. This may take a few minutes...')
            setTimeout(() => {
              window.location.reload()
            }, 10000)
          }
        } else {
          setMessage('Subscription is being processed. This may take a few minutes...')
          setTimeout(() => {
            window.location.reload()
          }, 10000)
        }
      } catch (error) {
        console.error('Error processing subscription:', error)
        setMessage('There was an issue processing your subscription. Please contact support.')
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      processSubscription()
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen relative overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 p-4">
      <PageOrbs />
      <Card className={`max-w-md w-full ${fancyCardClass}`}>
        <CardContent className="pt-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">Payment Successful!</h1>
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
          {loading && (
            <div className="flex justify-center">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          <div className="mt-4">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  )
}