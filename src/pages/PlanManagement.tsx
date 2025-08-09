import { useEffect, useMemo, useState } from "react";
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
  plan_type: "starter" | "professional" | "enterprise";
  created_at: string;
}

type BillingPlanRow = {
  id: string;
  plan_type: "starter" | "professional" | "enterprise";
  provider: "paypal";
  provider_plan_id: string;
  price_cents: number;
  currency: string;
  interval: "month";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const icons: Record<string, any> = {
  starter: Zap,
  professional: Crown,
  enterprise: Building,
};

const currencyFmt = (amountCents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    (amountCents || 0) / 100
  );

const PlanManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<BillingPlanRow[]>([]);

  // Load PayPal SDK once
  useEffect(() => {
    if (!document.getElementById("paypal-sdk")) {
      const script = document.createElement("script");
      script.id = "paypal-sdk";
      script.src = `https://www.paypal.com/sdk/js?client-id=${import.meta.env.VITE_PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Render PayPal buttons once SDK is ready
  useEffect(() => {
    if ((window as any).paypal && plans.length) {
      plans.forEach((p) => {
        const containerId = `paypal-button-container-${p.provider_plan_id}`;
        const container = document.getElementById(containerId);
        if (container && container.childNodes.length === 0) {
          (window as any).paypal.Buttons({
            style: {
              shape: "rect",
              color: "gold",
              layout: "vertical",
              label: "subscribe"
            },
            createSubscription: function (data: any, actions: any) {
              return actions.subscription.create({
                plan_id: p.provider_plan_id
              });
            },
            onApprove: function (data: any) {
              alert("Subscription ID: " + data.subscriptionID);
              // TODO: send subscriptionID to backend to save
            }
          }).render(`#${containerId}`);
        }
      });
    }
  }, [plans]);

  useEffect(() => {
    if (user) {
      fetchCurrentPlan();
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("billing_plans")
        .select("id,plan_type,provider,provider_plan_id,price_cents,currency,interval,metadata,created_at,updated_at")
        .eq("provider", "paypal")
        .order("price_cents", { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error("Error fetching billing_plans:", error);
      toast({
        title: "Error",
        description: "Failed to load plans.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const { data, error } = await supabase
        .from("user_plans")
        .select("id,plan_type,created_at")
        .eq("user_id", user?.id)
        .single();

      if (error && (error as any).code !== "PGRST116") {
        throw error;
      }
      setCurrentPlan(data as any);
    } catch (error) {
      console.error("Error fetching plan:", error);
    }
  };

  const featureMap: Record<
    BillingPlanRow["plan_type"],
    { features: string[] }
  > = useMemo(
    () => ({
      starter: {
        features: ["Up to 3 locations", "Basic analytics", "Review monitoring", "Email support"],
      },
      professional: {
        features: ["Up to 10 locations", "Advanced analytics", "AI review analysis", "Priority support", "Custom reports"],
      },
      enterprise: {
        features: ["Unlimited locations", "Full analytics suite", "AI-powered insights", "24/7 support", "Custom integrations", "Dedicated account manager"],
      },
    }),
    []
  );

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
            {currentPlan && (
              <Card className="mb-6 border-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="default" className="bg-accent text-white">
                      Current Plan
                    </Badge>
                    {currentPlan.plan_type.charAt(0).toUpperCase() + currentPlan.plan_type.slice(1)}
                  </CardTitle>
                  <CardDescription>
                    Active since {new Date(currentPlan.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => {
                const IconComponent = icons[p.plan_type] || Zap;
                const bullets = featureMap[p.plan_type]?.features || [];
                const price = currencyFmt(p.price_cents, p.currency);
                const isCurrent = currentPlan?.plan_type === p.plan_type;

                return (
                  <Card key={p.id} className={`relative ${isCurrent ? "bg-accent/5" : ""}`}>
                    {p.plan_type === "professional" && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-accent text-white">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                        <IconComponent className="h-6 w-6 text-accent" />
                      </div>
                      <CardTitle className="flex items-center justify-center gap-2 capitalize">
                        {p.plan_type}
                        {isCurrent && <Badge variant="outline">Current</Badge>}
                      </CardTitle>
                      <div className="text-3xl font-bold text-accent">
                        {price}
                        <span className="text-sm text-muted-foreground">/{p.interval}</span>
                      </div>
                      <CardDescription>
                        {p.plan_type === "starter"
                          ? "Perfect for small businesses"
                          : p.plan_type === "professional"
                          ? "Ideal for growing businesses"
                          : "For large organizations"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-6">
                        {bullets.map((feature) => (
                          <li key={feature} className="flex items-center">
                            <Check className="h-4 w-4 text-accent mr-2 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div id={`paypal-button-container-${p.provider_plan_id}`} />
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
