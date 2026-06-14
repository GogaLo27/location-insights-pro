import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/components/ui/auth-provider'
import { supabase } from '@/integrations/supabase/client'
import { PageOrbs, fancyCardClass } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, XCircle, LogIn, Loader2, Check } from 'lucide-react'

type Stage = 'pending' | 'active' | 'failed'

export default function BillingSuccess() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [stage, setStage] = useState<Stage>('pending')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (stage !== 'active') return
    if (countdown <= 0) {
      navigate('/dashboard')
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [stage, countdown, navigate])

  useEffect(() => {
    const processSubscription = async () => {
      try {
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          setErrorMessage('There was an issue processing your subscription. Please contact support.')
          setStage('failed')
          return
        }

        if (subscription?.status === 'active') {
          setStage('active')
          return
        }

        if (subscription?.status === 'failed') {
          setErrorMessage('Payment was not completed. Please try subscribing again.')
          setStage('failed')
          return
        }

        if (subscription?.status === 'pending') {
          const checkStatus = setInterval(async () => {
            const { data: updated } = await supabase
              .from('subscriptions')
              .select('status')
              .eq('id', subscription.id)
              .single()

            if (updated?.status === 'active') {
              clearInterval(checkStatus)
              setStage('active')
            } else if (updated?.status === 'failed') {
              clearInterval(checkStatus)
              setErrorMessage('Payment could not be confirmed. Please contact support.')
              setStage('failed')
            }
          }, 3000)

          setTimeout(() => {
            clearInterval(checkStatus)
            setErrorMessage('Activation is taking longer than expected. Check your dashboard or contact support.')
            setStage('failed')
          }, 300000)
        } else {
          setErrorMessage('Subscription is being processed. Please check your dashboard.')
          setStage('failed')
        }
      } catch {
        setErrorMessage('There was an issue processing your subscription. Please contact support.')
        setStage('failed')
      }
    }

    if (!authLoading && user) {
      processSubscription()
    }
  }, [user, authLoading])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen relative overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 p-4">
        <PageOrbs />
        <Card className={`max-w-lg w-full opacity-0 animate-fade-in-up ${fancyCardClass}`}>
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-5">
              <div className="mx-auto h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                <LogIn className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent mb-2">
                  Payment Received!
                </h1>
                <p className="text-sm text-muted-foreground">
                  Please sign in to activate your subscription.
                </p>
              </div>
              <Button onClick={() => navigate('/')} className="w-full">
                Sign In to Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const steps = [
    { label: 'Payment received', done: true },
    { label: 'Activating subscription', done: stage === 'active' },
    { label: 'Ready to go', done: stage === 'active' },
  ]

  return (
    <div className="min-h-screen relative overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 p-4">
      <PageOrbs />
      <Card className={`max-w-lg w-full opacity-0 animate-fade-in-up ${fancyCardClass}`}>
        <CardContent className="pt-8 pb-8">
          <div className="text-center space-y-6">
            <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center
              bg-accent/10">
              {stage === 'failed' ? (
                <XCircle className="h-8 w-8 text-destructive" />
              ) : stage === 'active' ? (
                <CheckCircle2 className="h-8 w-8 text-accent" />
              ) : (
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent mb-2">
                {stage === 'failed'
                  ? 'Something went wrong'
                  : stage === 'active'
                  ? 'You\'re all set!'
                  : 'Payment Successful!'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {stage === 'failed'
                  ? errorMessage
                  : stage === 'active'
                  ? `Redirecting to your dashboard in ${countdown}s...`
                  : 'Your payment was received — activating your subscription now.'}
              </p>
            </div>

            {stage !== 'failed' && (
              <div className="space-y-3 text-left">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                      step.done
                        ? 'bg-accent'
                        : i === 1 && stage === 'pending'
                        ? 'bg-primary/20 ring-2 ring-primary/40'
                        : 'bg-muted'
                    }`}>
                      {step.done ? (
                        <Check className="h-3.5 w-3.5 text-white" />
                      ) : i === 1 && stage === 'pending' ? (
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                    <span className={`text-sm ${step.done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={() => navigate(stage === 'failed' ? '/plan-selection' : '/dashboard')}
              variant={stage === 'failed' ? 'destructive' : 'default'}
              className="w-full"
            >
              {stage === 'failed' ? 'Try Again' : 'Go to Dashboard'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
