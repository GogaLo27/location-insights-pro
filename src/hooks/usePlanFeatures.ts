import { usePlan } from './usePlan';

export interface PlanFeatures {
  // Location limits
  maxLocations: number;
  canAddMoreLocations: (currentCount: number) => boolean;
  
  // AI features
  canUseAI: boolean;
  canUseAIAnalysis: boolean;
  canUseAIReplyGeneration: boolean;
  
  // Analytics features
  maxAnalyticsDays: number;
  canUseCustomDateRanges: boolean;
  canUseComparisonMode: boolean;
  canUseAdvancedCharts: boolean;
  
  // Export features
  canExportCSV: boolean;
  canExportPDF: boolean;
  
  // Bulk operations
  canBulkOperate: boolean;
  canBulkAnalyze: boolean;
  canBulkReply: boolean;
  
  // Review templates
  canUseReviewTemplates: boolean;
  maxCustomTemplates: number;
  
  // Support features
  supportLevel: 'email' | 'priority' | 'dedicated';
  has24_7Support: boolean;
  
  // Plan info
  planType: string | null;
  isStarter: boolean;
  isProfessional: boolean;
  isEnterprise: boolean;
}

export const usePlanFeatures = (): PlanFeatures => {
  const { plan } = usePlan();
  
  const planType = plan?.plan_type || null;
  const isStarter = planType === 'starter';
  const isProfessional = planType === 'professional';
  const isEnterprise = planType === 'enterprise';
  
  return {
    // Location limits
    maxLocations: isStarter ? 1 : isProfessional ? 5 : -1, // -1 = unlimited
    canAddMoreLocations: (currentCount: number) => {
      if (isEnterprise) return true;
      if (isProfessional) return currentCount < 5;
      if (isStarter) return currentCount < 1;
      return false;
    },
    
    // AI features
    canUseAI: !isStarter,
    canUseAIAnalysis: !isStarter,
    canUseAIReplyGeneration: !isStarter,
    
    // Analytics features
    maxAnalyticsDays: isStarter ? 30 : 365,
    canUseCustomDateRanges: !isStarter,
    canUseComparisonMode: !isStarter,
    canUseAdvancedCharts: !isStarter,
    
    // Export features
    canExportCSV: true, // All plans can export CSV
    canExportPDF: !isStarter,
    
    // Bulk operations
    canBulkOperate: !isStarter, // Available for Professional and Enterprise
    canBulkAnalyze: !isStarter, // Available for Professional and Enterprise
    canBulkReply: !isStarter, // Available for Professional and Enterprise
    
    // Review templates
    canUseReviewTemplates: isEnterprise, // Enterprise only
    maxCustomTemplates: isEnterprise ? -1 : 0, // -1 = unlimited for Enterprise
    
    // Support features
    supportLevel: isStarter ? 'email' : isProfessional ? 'priority' : 'dedicated',
    has24_7Support: isEnterprise,
    
    // Plan info
    planType,
    isStarter,
    isProfessional,
    isEnterprise,
  };
};

// Helper hook for upgrade prompts
export const useUpgradePrompt = () => {
  const { plan } = usePlan();
  
  const getUpgradeMessage = (feature: string, currentPlan: string) => {
    const messages = {
      'AI Analysis': {
        starter: 'Upgrade to Professional to unlock AI-powered review analysis and insights.',
        professional: 'Upgrade to Enterprise for unlimited AI analysis and advanced features.'
      },
      'Multiple Locations': {
        starter: 'Upgrade to Professional to manage up to 5 locations.',
        professional: 'Upgrade to Enterprise for unlimited locations.'
      },
      'Advanced Analytics': {
        starter: 'Upgrade to Professional for 1-year analytics and comparison mode.',
        professional: 'Upgrade to Enterprise for unlimited analytics and bulk operations.'
      },
      'PDF Export': {
        starter: 'Upgrade to Professional to export beautiful PDF reports.',
        professional: 'Upgrade to Enterprise for white-label PDF reports.'
      },
      'Bulk Operations': {
        starter: 'Upgrade to Professional for bulk analysis and reply generation.',
        professional: 'Bulk operations are available in your current plan.'
      },
      'Review Templates': {
        starter: 'Upgrade to Enterprise for pre-built and custom review response templates.',
        professional: 'Upgrade to Enterprise for pre-built and custom review response templates.'
      }
    };
    
    return messages[feature]?.[currentPlan] || 'Upgrade your plan to access this feature.';
  };
  
  const getUpgradeUrl = (currentPlan: string) => {
    if (currentPlan === 'starter') return '/plan-selection?upgrade=professional';
    if (currentPlan === 'professional') return '/plan-selection?upgrade=enterprise';
    return '/plan-selection';
  };
  
  return {
    getUpgradeMessage,
    getUpgradeUrl,
    currentPlan: plan?.plan_type || 'starter'
  };
};
