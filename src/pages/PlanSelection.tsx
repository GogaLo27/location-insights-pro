import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Zap, Building } from "lucide-react";

interface UserPlan {
  id: string;
  plan_type: string;
  created_at: string;
}

interface BillingPlan {
  id: string;
  plan_type: string;
  provider_plan_id: string;
  price_cents: number;
  currency: string;
}

const PlanManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingPlans, setBillingPlans] = useState<BillingPlan[]>([]);
  const paypalRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paypalClientId, setPaypalClientId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCurrentPlan();
    }
    fetchBillingPlans();
    fetchPaypalConfig();
  }, [user]);

  const fetchCurrentPlan = async () => {
    try {
      const { data, error } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setCurrentPlan(data);
    } catch (error) {
      console.error("Error fetching plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingPlans = async () => {
    const { data, error } = await supabase.from("billing_plans").select("*").eq("provider", "paypal");
    if (!error && data) {
      setBillingPlans(data);
    }
  };

  const fetchPaypalConfig = async () => {
    // Get PayPal client ID from Supabase function or config table
    const { data, error } = await supabase.from("config").select("value").eq("key", "PAYPAL_CLIENT_ID").single();
    if (!error && data) {
      setPaypalClientId(data.value);
    }
  };

  useEffect(() => {
    if (paypalClientId && billingPlans.length > 0) {
      // Load PayPal SDK once
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&vault=true&intent=subscription`;
      script.async = true;
      script.onload = renderAllButtons;
      document.body.appendChild(script);
    }
  }, [paypalClientId, billingPlans]);

  const renderAllButtons = () => {
    billingPlans.forEach((plan) => {
      if (paypalRefs.current[plan.plan_type]) {
        // @ts-ignore
        window.paypal.Buttons({
          style: {
            shape: "rect",
            color: "gold",
            layout: "vertical",
            label: "subscribe",
          },
          createSubscription: function (data: any, actions: any) {
            return actions.subscription.create({
              plan_id: plan.provider_plan_id,
            });
          },
          onApprove: function (data: any, actions: any) {
            toast({
              title: "Payment Approved",
              description: `Subscription ID: ${data.subscriptionID}`,
            });
            localStorage.setItem("pendingSubId", data.subscriptionID);
            window.location.href = "/billing-success?subscription_id=" + data.subscriptionID;
          },
          onError: function (err: any) {
            console.error("PayPal error:", err);
            toast({
              title: "Error",
              description: "PayPal payment failed.",
              variant: "destructive",
            });
          },
        }).render(paypalRefs.current[plan.plan_type]);
      }
    });
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading plans...</p>
        </div>
      </div>
    );
  }

  const iconMap: Record<string, any> = {
    starter: Zap,
    professional: Crown,
    enterprise: Building,
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-4">
              <h1 className="text-xl font-semibold">Plan Management</h1>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Manage Your Plan</h1>
              <p className="text-muted-foreground">Upgrade or downgrade your plan to fit your business needs</p>
            </div>

            {currentPlan && (
              <Card className="mb-6 border-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="default" className="bg-accent text-white">
                      Current Plan
                    </Badge>
                    {currentPlan.plan_type.charAt(0).toUpperCase() + currentPlan.plan_type.slice(1)}
                  </CardTitle>
                  <CardDescription>Active since {new Date(currentPlan.created_at).toLocaleDateString()}</CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {billingPlans.map((plan) => {
                const IconComponent = iconMap[plan.plan_type];
                return (
                  <Card key={plan.plan_type} className={`relative ${plan.plan_type === "professional" ? "border-accent shadow-lg" : ""} ${currentPlan?.plan_type === plan.plan_type ? "bg-accent/5" : ""}`}>
                    {plan.plan_type === "professional" && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-accent text-white">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                        <IconComponent className="h-6 w-6 text-accent" />
                      </div>
                      <CardTitle className="flex items-center justify-center gap-2">
                        {plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1)}
                        {currentPlan?.plan_type === plan.plan_type && <Badge variant="outline">Current</Badge>}
                      </CardTitle>
                      <div className="text-3xl font-bold text-accent">
                        ${(plan.price_cents / 100).toFixed(0)}
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                      <CardDescription>{plan.plan_type === "starter" ? "Perfect for small businesses" : plan.plan_type === "professional" ? "Ideal for growing businesses" : "For large organizations"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div ref={(el) => (paypalRefs.current[plan.plan_type] = el)} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default PlanManagement;
