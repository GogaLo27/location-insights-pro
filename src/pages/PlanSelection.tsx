import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CheckCircle, MapPin, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type BillingPlanRow = {
  id: string;
  plan_type: "starter" | "professional" | "enterprise";
  provider: "lemonsqueezy";
  provider_plan_id: string; // LemonSqueezy product id
  price_cents: number;
  currency: string; // "USD"
  interval: "month";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const currencyFmt = (amountCents: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    (amountCents || 0) / 100
  );

export default function PlanSelection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [plans, setPlans] = useState<BillingPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      try {
        // Use hardcoded LemonSqueezy plans with correct pricing
        const hardcodedPlans = [
          {
            id: "starter-plan",
            plan_type: "starter",
            provider: "lemonsqueezy",
            provider_plan_id: "669764",
            price_cents: 4900, // $49
            currency: "USD",
            interval: "month",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: "professional-plan",
            plan_type: "professional", 
            provider: "lemonsqueezy",
            provider_plan_id: "669762",
            price_cents: 9900, // $99
            currency: "USD",
            interval: "month",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: "enterprise-plan",
            plan_type: "enterprise",
            provider: "lemonsqueezy", 
            provider_plan_id: "669760",
            price_cents: 19900, // $199
            currency: "USD",
            interval: "month",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        
        const { data, error } = { data: hardcodedPlans, error: null };

        if (error) throw error;
        if (!mounted) return;
        setPlans((data as any) || []);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Failed to load plans",
          description: e.message || "Could not fetch billing plans.",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user, toast]);

  // You can keep/adjust these feature bullets per plan_type
  const featureMap: Record<
    BillingPlanRow["plan_type"],
    { locations: number; reviews: number; features: string[]; popular?: boolean }
  > = useMemo(
    () => ({
      starter: {
        locations: 1,
        reviews: 100,
        features: [
          "Up to 1 location",
          "Basic analytics",
          "30 days of analytics",
          "CSV Export",
          "Email support",
        ],
      },
      professional: {
        locations: 5,
        reviews: 500,
        features: [
          "Up to 5 locations",
          "AI Analysis",
          "AI Reply Generation",
          "Bulk Operations",
          "Analytics",
          "Custom Date Ranges",
          "Comparison Mode",
          "PDF Export",
          "Priority Support",
        ],
        popular: true,
      },
      enterprise: {
        locations: -1,
        reviews: -1,
        features: [
          "Unlimited locations",
          "AI Analysis",
          "AI Reply Generation",
          "Review Templates",
          "Bulk Operations",
          "Analytics",
          "PDF Export",
          "Custom Date Ranges",
          "Comparison Mode",
          "White-label Reports",
          "Brand Management",
          "24/7 Support",
        ],
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
          <p className="text-lg text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  const handleSubscribe = async (planType: BillingPlanRow["plan_type"]) => {
    try {
      setSubmittingPlan(planType);

      // Get Supabase auth JWT
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">Choose Your Plan</h1>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">
                Welcome to Location Insights Pro!
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the perfect plan for your business needs. You can
                upgrade or downgrade at any time.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((p) => {
                const f = featureMap[p.plan_type];
                const price = currencyFmt(p.price_cents, p.currency);
                return (
                  <Card
                    key={p.id}
                    className={`relative transition-all hover:shadow-lg ${
                      f?.popular ? "border-primary shadow-lg scale-105" : ""
                    } ${submittingPlan === p.plan_type ? "ring-2 ring-primary" : ""}`}
                  >
                    {f?.popular && (
                      <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl capitalize">
                        {p.plan_type}
                      </CardTitle>
                      <div className="text-3xl font-bold">
                        {price}
                        <span className="text-base font-normal text-muted-foreground">
                          /{p.interval}
                        </span>
                      </div>
                      <CardDescription>
                        {p.plan_type === "starter"
                          ? "Perfect for small businesses"
                          : p.plan_type === "professional"
                          ? "Ideal for growing businesses"
                          : "For large organizations"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {f.locations === -1
                              ? "Unlimited locations"
                              : `Up to ${f.locations} locations`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {f.reviews === -1
                              ? "Unlimited reviews"
                              : `Up to ${f.reviews} reviews`}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {f.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-primary" />
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* PayPal/Card button */}
                                             <Button
                         className="w-full"
                         onClick={() => handleSubscribe(p.plan_type)}
                         disabled={submittingPlan === p.plan_type}
                       >
                         {submittingPlan === p.plan_type
                           ? "Processing..."
                           : "Activate Plan"}
                       </Button>
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
}
