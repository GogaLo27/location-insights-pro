import { useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useToast } from "@/hooks/use-toast";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { DynamicPlanCard } from "@/components/DynamicPlanCard";
import { RefreshCw } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { PageOrbs } from "@/components/PageLayout";
import { supabase } from "@/integrations/supabase/client";

export default function PlanSelection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  const { plans, loading, error, refetch } = useBillingPlans('dodo', billingInterval);

  // Manual refresh function
  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Plans refreshed",
      description: "Latest plans loaded from database",
    });
  };

  const handleSubscribe = async (planType: string) => {
    setSubmittingPlan(planType);
    try {
      const { data, error } = await supabase.functions.invoke('dodo-create-checkout', {
        body: { plan_type: planType, interval: billingInterval },
      });
      if (error) throw error;
      if (!data?.checkout_url) throw new Error('No checkout URL returned');
      window.location.href = data.checkout_url;
    } catch (err: any) {
      toast({
        title: 'Checkout Error',
        description: err.message || 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
      setSubmittingPlan(null);
    }
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-primary/5 to-accent/5">
          <AppSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center min-h-[50vh]">
              <div className="text-center animate-fade-in">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Loading plans...</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  if (error) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Plans</h2>
                <p className="text-gray-600">Failed to load subscription plans. Please try again.</p>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <AppSidebar />
        <SidebarInset className="relative overflow-x-hidden">
          <PageOrbs />
          <SEOHead routePath="/plan-selection" />
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-10 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-3 sm:px-6">
              <div className="flex items-center gap-2 w-full">
                <SidebarTrigger className="-ml-1" />
                <h1 className="text-lg font-semibold">Choose Your Plan</h1>
                <button
                  onClick={handleRefresh}
                  className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all duration-300"
                  title="Refresh plans from database"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8 opacity-0 animate-fade-in-up">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent dark:to-primary/90">
                    Choose the Perfect Plan for Your Business
                  </h1>
                  <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                    Select a plan that fits your needs and start managing your online reputation today.
                  </p>
                </div>

                <div className="flex justify-center mb-8 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <div className="bg-muted rounded-full p-1 flex gap-1">
                    <button
                      onClick={() => setBillingInterval('month')}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        billingInterval === 'month'
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingInterval('year')}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        billingInterval === 'year'
                          ? 'bg-background shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Yearly
                      <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">Save 20%</span>
                    </button>
                  </div>
                </div>

                {plans.length > 0 ? (
                  <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                      <DynamicPlanCard
                        key={plan.id}
                        plan={plan}
                        currentPlan={null}
                        onSelect={handleSubscribe}
                        loading={submittingPlan === plan.plan_type}
                        isRecommended={plan.plan_type === 'professional'}
                      />
                        ))}
                      </div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Plans Available</h3>
                    <p className="text-gray-600">Please contact support if this issue persists.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}