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
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { DynamicPlanCard } from "@/components/DynamicPlanCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [pendingPlanName, setPendingPlanName] = useState<string | null>(null);
  
  // Fetch dynamic billing plans
  const { plans: paypalPlans, loading: plansLoading } = useBillingPlans('paypal');
  const { plans: lemonPlans } = useBillingPlans('lemonsqueezy');
  
  // Use PayPal plans if available, otherwise fallback to LemonSqueezy
  const dynamicPlans = paypalPlans.length > 0 ? paypalPlans : lemonPlans;

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

  // Use dynamic plans from database - convert to format expected by UI
  const plans = dynamicPlans.map((dbPlan) => ({
    id: dbPlan.plan_type,
    name: dbPlan.plan_name,
    description: dbPlan.plan_description,
    price: dbPlan.price_cents / 100, // Convert cents to dollars
    billing: dbPlan.interval as 'monthly' | 'yearly',
    features: (dbPlan.features || []).map((feature: string) => ({
      name: feature,
      description: feature,
      icon: Users
    })),
    popular: dbPlan.plan_type === 'professional',
    current: plan?.plan_type === dbPlan.plan_type,
  }));

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    
    // Simple approach: Create new subscription, charge immediately, user gets new features immediately
    // The old subscription will naturally expire and won't renew
    
    setIsUpgrading(true);
    try {
      // Get Supabase auth JWT
      const { data: authData } = await supabase.auth.getSession();
      const jwt = authData.session?.access_token || "";

      // Create new subscription via PayPal
      const paypalRes = await supabase.functions.invoke("paypal-create-subscription", {
        body: {
          plan_type: planId,
          return_url: `${window.location.origin}/billing-success`,
          cancel_url: `${window.location.origin}/upgrade`,
        },
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (paypalRes.error) {
        throw new Error(paypalRes.error.message || "PayPal edge function error");
      }

      let paypalPayload: any = paypalRes.data;
      if (typeof paypalPayload === "string") {
        try {
          paypalPayload = JSON.parse(paypalPayload);
        } catch {
          // ignore
        }
      }

      if (paypalPayload?.checkout_url) {
        // Redirect to PayPal for checkout
        window.location.href = paypalPayload.checkout_url;
        return;
      }

      throw new Error("No checkout URL returned");

    } catch (error: any) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade plan. Please try again.",
        variant: "destructive",
      });
      setIsUpgrading(false);
    }
  };

  const requestUpgrade = (planId: string, planName: string) => {
    setPendingPlanId(planId);
    setPendingPlanName(planName);
    setConfirmOpen(true);
  };

  const confirmUpgrade = async () => {
    if (!pendingPlanId) return;
    setConfirmOpen(false);
    await handleUpgrade(pendingPlanId);
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
                      onClick={() => requestUpgrade(planItem.id, planItem.name)}
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
                              Subscribe to {planItem.name}
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

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm upgrade to {pendingPlanName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Upgrading will switch you to {pendingPlanName} immediately and charge the full price now.
                    Your current subscription will be cancelled right away and will not renew. There are no refunds
                    or proration credits for any unused time from your previous plan. Do you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isUpgrading}>No, keep current plan</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmUpgrade} disabled={isUpgrading}>
                    Yes, charge me and upgrade
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

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
