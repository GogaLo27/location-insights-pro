import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Building, Star, ArrowRight } from 'lucide-react'

interface DynamicPlanCardProps {
  plan: {
    id: string
    plan_type: string
    plan_name: string
    plan_description: string
    price_cents: number
    currency: string
    interval: string
    features: string[]
    is_active: boolean
    trial_days: number
    max_locations: number | null
    support_level: string
  }
  currentPlan?: string | null
  onSelect: (planType: string) => void
  loading?: boolean
  isRecommended?: boolean
}

const planIcons = {
  starter: Zap,
  professional: Crown,
  enterprise: Building
}

const supportLevelIcons = {
  email: '📧',
  priority: '⭐',
  dedicated: '🛡️'
}

export function DynamicPlanCard({ 
  plan, 
  currentPlan, 
  onSelect, 
  loading = false, 
  isRecommended = false 
}: DynamicPlanCardProps) {
  const Icon = planIcons[plan.plan_type as keyof typeof planIcons] || Zap
  const isCurrentPlan = currentPlan === plan.plan_type
  const isUpgrade = currentPlan === 'starter' && plan.plan_type === 'professional'
  
  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(cents / 100)
  }

  const handleSelect = () => {
    if (isCurrentPlan) return
    onSelect(plan.plan_type)
  }

  return (
    <Card 
      className={`relative transition-all duration-200 hover:shadow-lg ${
        isCurrentPlan ? 'ring-2 ring-primary' : ''
      } ${isRecommended ? 'ring-2 ring-purple-500' : ''} ${
        !plan.is_active ? 'opacity-50' : ''
      }`}
    >
      {isRecommended && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-purple-500 text-white px-3 py-1">
            <Star className="w-3 h-3 mr-1" />
            Recommended
          </Badge>
        </div>
      )}
      
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{plan.plan_name}</CardTitle>
        <CardDescription>{plan.plan_description}</CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Pricing */}
        <div className="text-center">
          <div className="text-3xl font-bold">
            {formatPrice(plan.price_cents, plan.currency)}
          </div>
          <div className="text-sm text-muted-foreground">
            per {plan.interval}
          </div>
          {plan.trial_days > 0 && (
            <div className="text-sm text-green-600 font-medium mt-1">
              {plan.trial_days} day free trial
            </div>
          )}
        </div>

        {/* Plan Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {plan.max_locations && (
            <div className="flex items-center justify-between">
              <span>Locations</span>
              <span className="font-medium">{plan.max_locations}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span>Support</span>
            <span className="font-medium">
              {supportLevelIcons[plan.support_level as keyof typeof supportLevelIcons]} 
              {plan.support_level.charAt(0).toUpperCase() + plan.support_level.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Features */}
        <div className="space-y-3">
          {plan.features.slice(0, 5).map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
          {plan.features.length > 5 && (
            <div className="text-sm text-muted-foreground text-center">
              +{plan.features.length - 5} more features
            </div>
          )}
        </div>
        
        {/* Action Button */}
        <Button
          onClick={handleSelect}
          disabled={loading || isCurrentPlan || !plan.is_active}
          className="w-full"
          variant={isCurrentPlan ? "secondary" : isRecommended ? "default" : "outline"}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </div>
          ) : isCurrentPlan ? (
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Current Plan
            </div>
          ) : !plan.is_active ? (
            'Plan Unavailable'
          ) : (
            <div className="flex items-center gap-2">
              {isUpgrade ? 'Upgrade Now' : 'Get Started'}
              <ArrowRight className="h-4 w-4" />
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
