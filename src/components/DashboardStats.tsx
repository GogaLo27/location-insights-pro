import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, MessageSquare, Star, Users, MapPin } from 'lucide-react'

interface DashboardStatsProps {
  totalReviews: number
  averageRating: number
  positiveReviews: number
  negativeReviews: number
  neutralReviews: number
  totalLocations: number
  recentActivity: number
  loading?: boolean
}

export function DashboardStats({
  totalReviews,
  averageRating,
  positiveReviews,
  negativeReviews,
  neutralReviews,
  totalLocations,
  recentActivity,
  loading = false
}: DashboardStatsProps) {
  const positivePercentage = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0
  const negativePercentage = totalReviews > 0 ? (negativeReviews / totalReviews) * 100 : 0
  
  const stats = [
    {
      title: 'Total Reviews',
      value: totalReviews.toLocaleString(),
      description: 'All time reviews',
      icon: MessageSquare,
      trend: recentActivity > 0 ? 'up' : 'neutral',
      trendValue: recentActivity
    },
    {
      title: 'Average Rating',
      value: averageRating.toFixed(1),
      description: 'Out of 5 stars',
      icon: Star,
      trend: averageRating >= 4 ? 'up' : averageRating >= 3 ? 'neutral' : 'down',
      trendValue: averageRating
    },
    {
      title: 'Positive Reviews',
      value: `${positivePercentage.toFixed(1)}%`,
      description: `${positiveReviews} positive reviews`,
      icon: TrendingUp,
      trend: 'up',
      trendValue: positivePercentage
    },
    {
      title: 'Locations',
      value: totalLocations.toString(),
      description: 'Active locations',
      icon: MapPin,
      trend: 'neutral',
      trendValue: totalLocations
    }
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isPositive = stat.trend === 'up'
        const isNegative = stat.trend === 'down'
        
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>{stat.description}</span>
                {stat.trend !== 'neutral' && (
                  <Badge 
                    variant={isPositive ? 'default' : isNegative ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {isPositive && <TrendingUp className="h-3 w-3 mr-1" />}
                    {isNegative && <TrendingDown className="h-3 w-3 mr-1" />}
                    {stat.trend === 'up' ? '+' : stat.trend === 'down' ? '-' : ''}
                    {stat.trendValue > 0 && stat.trend !== 'neutral' ? stat.trendValue.toFixed(1) : ''}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
