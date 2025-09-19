import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { 
  Check, 
  X, 
  Star, 
  Zap, 
  Crown, 
  ArrowRight, 
  Users, 
  FileText, 
  BarChart3, 
  Bot, 
  Download,
  Calendar,
  Filter,
  Settings,
  Lock,
  Unlock,
  Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlan } from "@/hooks/usePlan";

interface PlanFeature {
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing: 'monthly' | 'yearly';
  features: PlanFeature[];
  popular?: boolean;
  current?: boolean;
}

const Upgrade = () => {
  const { user, loading: authLoading } = useAuth();
  const { plan, loading: planLoading, refetch } = usePlan();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const features: PlanFeature[] = [
    { name: "Locations", description: "Number of business locations", icon: Users },
    { name: "AI Analysis", description: "AI-powered review sentiment analysis", icon: Bot },
    { name: "AI Reply Generation", description: "AI-generated response suggestions", icon: Bot },
    { name: "Review Templates", description: "Pre-built and custom response templates", icon: FileText },
    { name: "Bulk Operations", description: "Bulk analyze and reply to reviews", icon: Zap },
    { name: "Analytics", description: "Advanced analytics and reporting", icon: BarChart3 },
    { name: "PDF Export", description: "Export reports to PDF", icon: Download },
    { name: "Custom Date Ranges", description: "Custom analytics date ranges", icon: Calendar },
    { name: "Comparison Mode", description: "Compare analytics periods", icon: BarChart3 },
    { name: "White-label Reports", description: "Branded PDF reports", icon: Settings },
    { name: "Brand Management", description: "Multi-brand support and management", icon: Settings },
  ];

  const plans: Plan[] = [
    {
      id: "starter",
      name: "Starter",
      description: "Perfect for small businesses getting started",
      price: 49,
      billing: 'monthly',
      features: [
        { name: "Locations", description: "Up to 1 location", icon: Users },
        { name: "Basic Analytics", description: "30 days of analytics", icon: BarChart3 },
        { name: "CSV Export", description: "Export data to CSV", icon: Download },
        { name: "Email Support", description: "Email support", icon: Mail },
      ],
      current: plan?.plan_type === 'starter',
    },
    {
      id: "professional",
      name: "Professional",
      description: "Advanced features for growing businesses",
      price: 99,
      billing: 'monthly',
      features: [
        { name: "Locations", description: "Up to 5 locations", icon: Users },
        { name: "AI Analysis", description: "AI sentiment analysis", icon: Bot },
        { name: "AI Reply Generation", description: "AI response suggestions", icon: Bot },
        { name: "Bulk Operations", description: "Bulk analyze and reply", icon: Zap },
        { name: "Analytics", description: "Extended analytics data", icon: BarChart3 },
        { name: "Custom Date Ranges", description: "Custom analytics periods", icon: Calendar },
        { name: "Comparison Mode", description: "Compare analytics periods", icon: BarChart3 },
        { name: "PDF Export", description: "Export reports to PDF", icon: Download },
        { name: "Priority Support", description: "Priority email support", icon: Mail },
      ],
      popular: true,
      current: plan?.plan_type === 'professional',
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Complete solution for large businesses",
      price: 199,
      billing: 'monthly',
      features: [
        { name: "Locations", description: "Unlimited locations", icon: Users },
        { name: "AI Analysis", description: "AI sentiment analysis", icon: Bot },
        { name: "AI Reply Generation", description: "AI response suggestions", icon: Bot },
        { name: "Review Templates", description: "Custom response templates", icon: FileText },
        { name: "Bulk Operations", description: "Bulk analyze and reply", icon: Zap },
        { name: "Analytics", description: "Extended analytics data", icon: BarChart3 },
        { name: "PDF Export", description: "Export reports to PDF", icon: Download },
        { name: "Custom Date Ranges", description: "Custom analytics periods", icon: Calendar },
        { name: "Comparison Mode", description: "Compare analytics periods", icon: BarChart3 },
        { name: "White-label Reports", description: "Branded PDF reports", icon: Settings },
        { name: "Brand Management", description: "Multi-brand support", icon: Settings },
        { name: "24/7 Support", description: "Dedicated 24/7 support", icon: Mail },
      ],
      current: plan?.plan_type === 'enterprise',
    },
  ];

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    
    setIsUpgrading(true);
    try {
      // Update user plan in database
      const { error } = await supabase
        .from('user_plans')
        .update({
          plan_type: planId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh plan data
      await refetch();
      
      toast({
        title: "Success",
        description: `Successfully upgraded to ${plans.find(p => p.id === planId)?.name} plan!`,
      });
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Error",
        description: "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const getFeatureStatus = (featureName: string, planId: string) => {
    const plan = plans.find(p => p.id === planId);
    const feature = plan?.features.find(f => f.name === featureName);
    return feature ? 'included' : 'not-included';
  };

  const getFeatureIcon = (featureName: string, planId: string) => {
    const status = getFeatureStatus(featureName, planId);
    if (status === 'included') {
      return <Check className="h-4 w-4 text-green-600" />;
    }
    return <X className="h-4 w-4 text-gray-400" />;
  };

  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading upgrade options...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-4">
              <h1 className="text-xl font-semibold">Upgrade Plan</h1>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Current Plan Status */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {plan?.plan_type === 'enterprise' ? (
                        <Crown className="h-6 w-6 text-primary" />
                      ) : plan?.plan_type === 'professional' ? (
                        <Star className="h-6 w-6 text-primary" />
                      ) : (
                        <Users className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        Current Plan: {plans.find(p => p.id === plan?.plan_type)?.name || 'Starter'}
                      </h3>
                      <p className="text-muted-foreground">
                        {plans.find(p => p.id === plan?.plan_type)?.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-primary border-primary">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {plans.map((planItem) => (
                <Card 
                  key={planItem.id} 
                  className={`relative ${
                    planItem.popular 
                      ? 'border-primary shadow-lg scale-105' 
                      : planItem.current 
                        ? 'border-green-500 bg-green-50/50' 
                        : 'border-border'
                  }`}
                >
                  {planItem.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-2">
                      {planItem.id === 'enterprise' ? (
                        <Crown className="h-8 w-8 text-primary" />
                      ) : planItem.id === 'professional' ? (
                        <Star className="h-8 w-8 text-primary" />
                      ) : (
                        <Users className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <CardTitle className="text-2xl">{planItem.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {planItem.description}
                    </CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        ${planItem.price}
                      </span>
                      <span className="text-muted-foreground">/{planItem.billing}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {planItem.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm">{feature.description}</span>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className="w-full mt-6"
                      variant={planItem.popular ? "default" : "outline"}
                      disabled={planItem.current || isUpgrading}
                      onClick={() => handleUpgrade(planItem.id)}
                    >
                      {planItem.current ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          {isUpgrading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Upgrading...
                            </>
                          ) : (
                            <>
                              Upgrade to {planItem.name}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Feature Comparison Table */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Comparison</CardTitle>
                <CardDescription>
                  Compare all features across our plans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium">Features</th>
                        {plans.map((plan) => (
                          <th key={plan.id} className="text-center p-3 font-medium">
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map((feature) => (
                        <tr key={feature.name} className="border-b">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <feature.icon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{feature.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {feature.description}
                            </p>
                          </td>
                          {plans.map((plan) => (
                            <td key={plan.id} className="p-3 text-center">
                              {getFeatureIcon(feature.name, plan.id)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Can I change my plan anytime?</h4>
                  <p className="text-sm text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">What happens to my data when I upgrade?</h4>
                  <p className="text-sm text-muted-foreground">
                    All your existing data is preserved when you upgrade. You'll gain access to new features immediately.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Do you offer refunds?</h4>
                  <p className="text-sm text-muted-foreground">
                    We offer a 30-day money-back guarantee for all paid plans. Contact support for assistance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Upgrade;
