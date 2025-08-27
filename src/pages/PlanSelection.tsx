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
  provider: "paypal";
  provider_plan_id: string; // PayPal plan id "P-XXXX"
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
        // fetch fake plans from DB
        const { data, error } = await (supabase as any)
          .from("billing_plans")
          .select(
            "id,plan_type,provider,provider_plan_id,price_cents,currency,interval,metadata,created_at,updated_at"
          )
          .eq("provider", "fake")
          .order("price_cents", { ascending: true });

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
        locations: 3,
        reviews: 100,
        features: [
          "Up to 3 locations",
          "Basic analytics",
          "Review monitoring",
          "Email support",
        ],
      },
      professional: {
        locations: 10,
        reviews: 500,
        features: [
          "Up to 10 locations",
          "Advanced analytics",
          "AI review analysis",
          "Priority support",
          "Custom reports",
        ],
        popular: true,
      },
      enterprise: {
        locations: -1,
        reviews: -1,
        features: [
          "Unlimited locations",
          "Full analytics suite",
          "AI-powered insights",
          "24/7 support",
          "Custom integrations",
          "Dedicated account manager",
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

      // Use fake payment system
      const res = await supabase.functions.invoke("fake-payment", {
        body: {
          plan_type: planType,
        },
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.error) {
        throw new Error(res.error.message || "Edge function error");
      }

      let payload: any = res.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          // ignore
        }
      }

      if (!payload?.success) {
        console.error("Unexpected payload shape:", payload);
        throw new Error("Payment failed");
      }

      // Show success message
      toast({
        title: "Payment Successful!",
        description: payload.message || "Your subscription has been activated.",
      });

      // Redirect to dashboard
      if (payload.redirect_url) {
        window.location.href = payload.redirect_url;
      } else {
        window.location.href = "/dashboard";
      }
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
                           : "Activate Plan (Free Demo)"}
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
