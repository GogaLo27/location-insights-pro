// src/pages/PlanSelection.tsx
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/ui/auth-provider";
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
import { CheckCircle, MapPin, Star, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// NEW: inline card checkout component (no PayPal account)
import PayPalCardCheckout from "@/components/payments/PayPalCardCheckout";

type PlanId = "starter" | "professional" | "enterprise";

const plans = [
  {
    id: "starter" as PlanId,
    name: "Starter",
    priceLabel: "$29",
    amount: "29.00",
    description: "Perfect for small businesses",
    features: [
      "Up to 3 locations",
      "Basic analytics",
      "Review monitoring",
      "Email support",
    ],
    locations: 3,
    reviews: 100,
  },
  {
    id: "professional" as PlanId,
    name: "Professional",
    priceLabel: "$79",
    amount: "79.00",
    description: "For growing businesses",
    features: [
      "Up to 10 locations",
      "Advanced analytics",
      "AI review analysis",
      "Priority support",
      "Custom reports",
    ],
    locations: 10,
    reviews: 500,
    popular: true,
  },
  {
    id: "enterprise" as PlanId,
    name: "Enterprise",
    priceLabel: "$199",
    amount: "199.00",
    description: "For enterprises",
    features: [
      "Unlimited locations",
      "Full analytics suite",
      "AI-powered insights",
      "24/7 support",
      "Custom integrations",
      "Dedicated account manager",
    ],
    locations: -1, // Unlimited
    reviews: -1,
  },
];

const PlanSelection = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [startingSub, setStartingSub] = useState<PlanId | null>(null);
  const [showCardFor, setShowCardFor] = useState<PlanId | null>(null);
  const [supabaseJwt, setSupabaseJwt] = useState<string>("");

  // pull a fresh JWT for function calls that require Authorization
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSupabaseJwt(session?.access_token || "");
    })();
    return () => { mounted = false; };
  }, [user?.id]);

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;

  // If not authenticated and not loading, send to landing page
  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  // Show a spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // ORIGINAL FLOW: create PayPal subscription and redirect to approval URL
  const handlePlanSelect = async (planType: PlanId) => {
    if (!user) return;
    setSelectedPlan(planType);
    setStartingSub(planType);

    try {
      const res = await supabase.functions.invoke('paypal-create-subscription', {
        body: {
          plan_type: planType, // 'starter' | 'professional' | 'enterprise'
          return_url: `${window.location.origin}/billing/success`,
          cancel_url: `${window.location.origin}/billing/cancel`,
        },
        headers: supabaseJwt ? { Authorization: `Bearer ${supabaseJwt}` } : {},
      });

      if (res.error) {
        console.error("invoke error:", res.error);
        throw new Error(res.error.message || "Edge function error");
      }

      let payload: any = res.data;
      if (typeof payload === "string") {
        try { payload = JSON.parse(payload); } catch { /* ignore */ }
      }

      if (!payload?.approval_url) {
        console.error("Unexpected payload shape:", payload);
        throw new Error("No approval_url returned");
      }

      if (payload.subscription_id) {
        localStorage.setItem("pendingSubId", payload.subscription_id);
      }

      // redirect to PayPal (requires PayPal account / Subscriptions API)
      window.location.href = payload.approval_url;
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Payment error",
        description: e.message || "Failed to start subscription",
        variant: "destructive",
      });
      setStartingSub(null);
      setSelectedPlan(null);
    }
  };

  // NEW FLOW: pay by card without PayPal account (one-time)
  // Renders Hosted Fields inline for the selected plan
  const renderCardBlock = (plan: typeof plans[number]) => {
    if (!paypalClientId) {
      return (
        <div className="text-sm text-red-500">
          Missing VITE_PAYPAL_CLIENT_ID in your env.
        </div>
      );
    }

    return (
      <div className="mt-4 border rounded-lg p-4 space-y-3 bg-muted/30">
        <div className="text-sm text-muted-foreground">
          Pay by card without a PayPal account.
        </div>
        <PayPalCardCheckout
          clientId={paypalClientId}
          amount={plan.amount}
          currency="USD"
          reference={`plan-${plan.id}`}
          authToken={supabaseJwt}
          // defaults call /functions/v1/paypal-create-order and /functions/v1/paypal-capture-order
        />
      </div>
    );
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
                Choose the perfect plan for your business needs.
                You can upgrade or downgrade at any time.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => {
                const isSelecting = startingSub === plan.id;
                const cardOpen = showCardFor === plan.id;

                return (
                  <Card
                    key={plan.id}
                    className={`relative transition-all hover:shadow-lg ${
                      plan.popular ? "border-primary shadow-lg scale-105" : ""
                    } ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <CardTitle className="text-2xl">{plan.name}</CardTitle>
                      <div className="text-3xl font-bold">
                        {plan.priceLabel}
                        <span className="text-base font-normal text-muted-foreground">
                          /month
                        </span>
                      </div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {plan.locations === -1
                              ? "Unlimited locations"
                              : `Up to ${plan.locations} locations`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {plan.reviews === -1
                              ? "Unlimited reviews"
                              : `Up to ${plan.reviews} reviews`}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Original: Subscriptions API (requires PayPal account) */}
                        <Button
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                          disabled={isSelecting}
                          onClick={() => handlePlanSelect(plan.id)}
                        >
                          {isSelecting ? (
                            <span className="inline-flex items-center">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Redirecting…
                            </span>
                          ) : (
                            "Subscribe with PayPal"
                          )}
                        </Button>

                        {/* New: Card without PayPal account (inline Hosted Fields) */}
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() =>
                            setShowCardFor((prev) => (prev === plan.id ? null : plan.id))
                          }
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay with card (no PayPal)
                        </Button>
                      </div>

                      {/* Inline card form */}
                      {cardOpen && renderCardBlock(plan)}
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

export default PlanSelection;
