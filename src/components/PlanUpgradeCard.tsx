import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Zap, Building, ArrowRight, Star } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PlanUpgradeCardProps {
  planType: 'starter' | 'professional' | 'enterprise'
  currentPlan?: string | null
  onUpgrade: (planType: string) => void
  loading?: boolean
}

const planFeatures = {
  starter: [
    'Up to 5 locations',
    'Basic review monitoring',
    'Email support',
    'Monthly reports'
  ],
  professional: [
    'Up to 25 locations',
    'Advanced analytics',
    'Sentiment analysis',
    'Priority support',
    'Custom reports',
    'API access'
  ],
  enterprise: [
    'Unlimited locations',
    'White-label solution',
    'Custom integrations',
    'Dedicated support',
    'Advanced security',
    'Custom branding'
  ]
}

const planIcons = {
  starter: Zap,
  professional: Crown,
  enterprise: Building
}

const planColors = {
  starter: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
  professional: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
  enterprise: 'border-gold-200 bg-gold-50 dark:border-gold-800 dark:bg-gold-950'
}

export function PlanUpgradeCard({ planType, currentPlan, onUpgrade, loading }: PlanUpgradeCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { toast } = useToast()
  
  const Icon = planIcons[planType]
  const features = planFeatures[planType]
  const isCurrentPlan = currentPlan === planType
  const isUpgrade = currentPlan === 'starter' && planType === 'professional'
  const isRecommended = planType === 'professional'
  
  const handleUpgrade = () => {
    if (isCurrentPlan) {
      toast({
        title: "Current Plan",
        description: "You're already on this plan!",
        variant: "default"
      })
      return
    }
    
    onUpgrade(planType)
  }

  return (
    <Card 
      className={`relative transition-all duration-200 hover:shadow-lg ${
        isCurrentPlan ? 'ring-2 ring-primary' : ''
      } ${isRecommended ? 'ring-2 ring-purple-500' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        <CardTitle className="text-xl capitalize">{planType}</CardTitle>
        <CardDescription>
          {planType === 'starter' && 'Perfect for small businesses'}
          {planType === 'professional' && 'Ideal for growing companies'}
          {planType === 'enterprise' && 'For large organizations'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Features */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>
        
        {/* Action Button */}
        <Button
          onClick={handleUpgrade}
          disabled={loading || isCurrentPlan}
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
