import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Building2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUpgradePrompt, usePlanFeatures } from "@/hooks/usePlanFeatures";

interface UpgradePromptProps {
  feature: string;
  title?: string;
  description?: string;
  variant?: 'card' | 'inline' | 'modal';
  className?: string;
}

const planIcons = {
  professional: Crown,
  enterprise: Building2,
  starter: Zap
};

const planColors = {
  professional: 'bg-gradient-to-r from-purple-500 to-pink-500',
  enterprise: 'bg-gradient-to-r from-blue-600 to-indigo-600',
  starter: 'bg-gradient-to-r from-green-500 to-emerald-500'
};

export const UpgradePrompt = ({ 
  feature, 
  title, 
  description, 
  variant = 'card',
  className = '' 
}: UpgradePromptProps) => {
  const navigate = useNavigate();
  const { getUpgradeMessage, getUpgradeUrl, currentPlan } = useUpgradePrompt();
  
  const message = getUpgradeMessage(feature, currentPlan);
  const upgradeUrl = getUpgradeUrl(currentPlan);
  
  const nextPlan = currentPlan === 'starter' ? 'professional' : 'enterprise';
  const Icon = planIcons[nextPlan];
  const colorClass = planColors[nextPlan];
  
  const handleUpgrade = () => {
    navigate(upgradeUrl);
  };
  
  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed ${className}`}>
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{message}</span>
        <Button size="sm" variant="outline" onClick={handleUpgrade} className="ml-auto">
          Upgrade
        </Button>
      </div>
    );
  }
  
  if (variant === 'modal') {
    return (
      <div className={`text-center p-6 ${className}`}>
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${colorClass} mb-4`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {title || `Upgrade to ${nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)}`}
        </h3>
        <p className="text-muted-foreground mb-4">
          {description || message}
        </p>
        <Button onClick={handleUpgrade} className="w-full">
          Upgrade Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }
  
  // Default card variant
  return (
    <Card className={`border-dashed border-2 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${colorClass} mx-auto mb-3`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-lg">
          {title || `Upgrade to ${nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)}`}
        </CardTitle>
        <CardDescription>
          {description || message}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={handleUpgrade} className="w-full">
          Upgrade Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Badge variant="secondary" className="mt-3">
          {nextPlan.charAt(0).toUpperCase() + nextPlan.slice(1)} Plan
        </Badge>
      </CardContent>
    </Card>
  );
};

// Feature gate wrapper component
interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  variant?: 'card' | 'inline' | 'modal';
  className?: string;
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback, 
  variant = 'card',
  className = '' 
}: FeatureGateProps) => {
  const { canUseAI, canUseAIAnalysis, canUseAIReplyGeneration, canUseCustomDateRanges, canUseComparisonMode, canUseAdvancedCharts, canExportPDF, canBulkOperate, canUseReviewTemplates } = usePlanFeatures();
  
  const featureAccess = {
    'AI Analysis': canUseAIAnalysis,
    'AI Reply Generation': canUseAIReplyGeneration,
    'Custom Date Ranges': canUseCustomDateRanges,
    'Comparison Mode': canUseComparisonMode,
    'Advanced Charts': canUseAdvancedCharts,
    'PDF Export': canExportPDF,
    'Bulk Operations': canBulkOperate,
    'Review Templates': canUseReviewTemplates,
  };
  
  const hasAccess = featureAccess[feature] ?? true;
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  return <UpgradePrompt feature={feature} variant={variant} className={className} />;
};
