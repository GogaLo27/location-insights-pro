import { useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate, useNavigate } from "react-router-dom";
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

export default function PlanSelection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  // Use dynamic billing plans from database (PayPal and Keepz)
  const { plans: paypalPlans, loading: paypalLoading, error: paypalError, refetch: refetchPaypal } = useBillingPlans('paypal');
  const { plans: keepzPlans, loading: keepzLoading, error: keepzError, refetch: refetchKeepz } = useBillingPlans('keepz');
  
  // Combine all plans - Keepz test plans + PayPal main plans
  const plans = [...keepzPlans, ...paypalPlans];
  const loading = paypalLoading || keepzLoading;
  const error = paypalError || keepzError;
  
  // Manual refresh function
  const handleRefresh = async () => {
    await refetchPaypal();
    await refetchKeepz();
    toast({
      title: "Plans refreshed",
      description: "Latest plans loaded from database",
    });
  };

  const handleSubscribe = async (planType: string) => {
    // Redirect to checkout page where user can choose payment method
    navigate(`/checkout?plan=${planType}`);
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