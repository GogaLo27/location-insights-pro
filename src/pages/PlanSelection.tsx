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
import { supabase } from "@/integrations/supabase/client";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { DynamicPlanCard } from "@/components/DynamicPlanCard";
import { RefreshCw } from "lucide-react";

export default function PlanSelection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  // Use dynamic billing plans from database (try paypal first, fallback to lemonsqueezy)
  const { plans: paypalPlans, loading: paypalLoading, error: paypalError, refetch: refetchPaypal } = useBillingPlans('paypal');
  const { plans: lemonPlans, loading: lemonLoading, error: lemonError, refetch: refetchLemon } = useBillingPlans('lemonsqueezy');
  
  // Use PayPal plans if available, otherwise fallback to LemonSqueezy
  const plans = paypalPlans.length > 0 ? paypalPlans : lemonPlans;
  const loading = paypalLoading || lemonLoading;
  const error = paypalError || lemonError;
  
  // Manual refresh function
  const handleRefresh = async () => {
    await refetchPaypal();
    await refetchLemon();
    toast({
      title: "Plans refreshed",
      description: "Latest plans loaded from database",
    });
  };

  const handleSubscribe = async (planType: string) => {
    try {
      setSubmittingPlan(planType);
      const { data: authData } = await supabase.auth.getSession();
      const jwt = authData.session?.access_token || "";

      // Try PayPal first (default payment method)
      try {
        const paypalRes = await supabase.functions.invoke("paypal-create-subscription", {
        body: {
          plan_type: planType,
          return_url: `${window.location.origin}/billing-success`,
          cancel_url: `${window.location.origin}/plan-selection`,
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
      } catch (paypalError) {
        console.warn("PayPal subscription failed, falling back to LemonSqueezy:", paypalError);
        
        // Fallback to LemonSqueezy
        const lemonRes = await supabase.functions.invoke("lemonsqueezy-create-subscription", {
          body: {
            plan_type: planType,
            return_url: `${window.location.origin}/billing-success`,
            cancel_url: `${window.location.origin}/plan-selection`,
          },
          headers: { Authorization: `Bearer ${jwt}` },
        });

        if (lemonRes.error) {
          throw new Error(lemonRes.error.message || "LemonSqueezy edge function error");
        }

        let lemonPayload: any = lemonRes.data;
        if (typeof lemonPayload === "string") {
          try {
            lemonPayload = JSON.parse(lemonPayload);
          } catch {
            // ignore
          }
        }

        if (!lemonPayload?.checkout_url) {
          console.error("Unexpected LemonSqueezy payload shape:", lemonPayload);
        throw new Error("Failed to create LemonSqueezy subscription");
      }

      // Redirect to LemonSqueezy for checkout
        window.location.href = lemonPayload.checkout_url;
        return;
      }

      // If we get here, both PayPal and LemonSqueezy failed
      throw new Error("Both PayPal and LemonSqueezy payment methods failed");

    } catch (e: any) {
      console.error(e);
      toast({
        title: "Payment error",
        description: e.message || "Failed to process payment",
        variant: "destructive",
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
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset>
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 flex flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4 w-full">
                <SidebarTrigger className="-ml-1" />
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold">Choose Your Plan</h1>
                </div>
                <button
                  onClick={handleRefresh}
                  className="ml-auto flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Refresh plans from database"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Choose the Perfect Plan for Your Business
                  </h1>
                  <p className="text-lg text-gray-600">
                    Select a plan that fits your needs and start managing your online reputation today.
              </p>
            </div>

                {plans.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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