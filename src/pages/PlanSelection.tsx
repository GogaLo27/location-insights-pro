import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate, useNavigate } from "react-router-dom";
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
import { CheckCircle, MapPin, Star, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    paypal?: any;
  }
}

type PayPalConfig = {
  clientId: string;
  environment: "sandbox" | "live";
};

const loadPayPalSdk = async (clientId: string) => {
  if (window.paypal) return;
  const script = document.createElement("script");
  script.src =
    `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
    `&components=card-fields&vault=true`;
  script.async = true;
  document.body.appendChild(script);
  await new Promise<void>((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayPal SDK"));
  });
};

const PlanSelection = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ppCfg, setPpCfg] = useState<PayPalConfig | null>(null);

  // Refs for card fields
  const cardInstanceRef = useRef<any>(null);

  // Plans UI (unchanged except we’ll trigger card flow instead of redirect)
  const plans = useMemo(
    () => [
      {
        id: "starter",
        name: "Starter",
        price: "$29",
        description: "Perfect for small businesses",
        features: ["Up to 3 locations", "Basic analytics", "Review monitoring", "Email support"],
        locations: 3,
        reviews: 100,
      },
      {
        id: "professional",
        name: "Professional",
        price: "$79",
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
        id: "enterprise",
        name: "Enterprise",
        price: "$199",
        description: "For enterprises",
        features: [
          "Unlimited locations",
          "Full analytics suite",
          "AI-powered insights",
          "24/7 support",
          "Custom integrations",
          "Dedicated account manager",
        ],
        locations: -1,
        reviews: -1,
      },
    ],
    []
  );

  // Fetch PayPal client id from the server (so you don’t need .env on the client)
  const ensurePayPalReady = async () => {
    if (ppCfg) return ppCfg;
    const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
      body: { action: "get_config" },
    });
    if (error) throw error;
    const cfg: PayPalConfig = typeof data === "string" ? JSON.parse(data) : data;
    await loadPayPalSdk(cfg.clientId);
    setPpCfg(cfg);
    return cfg;
  };

  // Build and render card fields into the modal
  const renderCardFields = async (planType: string) => {
    const paypal = window.paypal;
    if (!paypal) throw new Error("PayPal SDK not available");

    // Create setup token via server on demand
    const createVaultSetupToken = async () => {
      const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
        body: { action: "create_setup_token" },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (!payload?.id) throw new Error("Failed to create setup token");
      return payload.id as string;
    };

    // Destroy previous instance if any
    try {
      cardInstanceRef.current?.teardown?.();
    } catch {}
    cardInstanceRef.current = null;

    const card = paypal.CardFields({
      // PayPal docs: createVaultSetupToken must return a string token from server
      // The SDK will update that token with card details under the hood.
      createVaultSetupToken,
      onApprove: async ({ vaultSetupToken }: { vaultSetupToken: string }) => {
        try {
          setLoading(true);
          // Exchange setup token -> payment token and create the subscription (server)
          const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
            body: {
              action: "create_subscription_with_vault",
              plan_type: planType,
              vault_setup_token: vaultSetupToken,
            },
          });
          if (error) throw error;
          const res = typeof data === "string" ? JSON.parse(data) : data;

          if (res?.status === "active") {
            // No redirect needed; go straight to success
            localStorage.setItem("pendingSubId", res.local_subscription_id || res.subscription_id || "");
            navigate("/billing/success?subscription_id=" + (res.subscription_id || ""));
          } else if (res?.status) {
            // Pending or other state – still go to success page which polls and syncs
            localStorage.setItem("pendingSubId", res.local_subscription_id || "");
            navigate("/billing/success?subscription_id=" + (res.subscription_id || ""));
          } else {
            throw new Error("Unexpected response from server");
          }
        } catch (e: any) {
          console.error(e);
          toast({
            title: "Payment error",
            description: e?.message || "Failed to create subscription",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
          setShowCardModal(false);
          try { cardInstanceRef.current?.teardown?.(); } catch {}
        }
      },
      onError: (err: any) => {
        console.error("PayPal CardFields error:", err);
        toast({
          title: "Payment error",
          description: "Card form error. Please check details and try again.",
          variant: "destructive",
        });
      },
    });

    // Render fields
    if (card.isEligible()) {
      card.NameField().render("#pp-card-name");
      card.NumberField().render("#pp-card-number");
      card.ExpiryField().render("#pp-card-expiry");
      card.CVVField().render("#pp-card-cvv");
    } else {
      throw new Error("Card fields not eligible for this buyer/account.");
    }

    cardInstanceRef.current = card;
  };

  const handlePlanSelect = async (planType: string) => {
    if (!user) return;
    setSelectedPlan(planType);
    try {
      setLoading(true);
      await ensurePayPalReady();
      setShowCardModal(true);
      // Slight delay so modal DOM exists before rendering fields
      setTimeout(() => {
        renderCardFields(planType).catch((e) => {
          console.error(e);
          toast({
            title: "Payment error",
            description: e?.message || "Unable to render card fields.",
            variant: "destructive",
          });
          setShowCardModal(false);
          setSelectedPlan(null);
        });
      }, 50);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Payment error",
        description: e?.message || "Unable to initialize card payment.",
        variant: "destructive",
      });
      setSelectedPlan(null);
    } finally {
      setLoading(false);
    }
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

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
              <h2 className="text-3xl font-bold mb-4">Welcome to Location Insights Pro!</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the perfect plan for your business needs. You can upgrade or downgrade at any time.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
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
                      {plan.price}
                      <span className="text-base font-normal text-muted-foreground">/month</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {plan.locations === -1 ? "Unlimited locations" : `Up to ${plan.locations} locations`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-primary" />
                        <span className="font-medium">
                          {plan.reviews === -1 ? "Unlimited reviews" : `Up to ${plan.reviews} reviews`}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-primary" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "outline"}
                      disabled={loading && selectedPlan === plan.id}
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      {loading && selectedPlan === plan.id ? "Processing…" : "Pay by Card"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </SidebarInset>
      </div>

      {/* Card modal */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-xl relative">
            <button
              className="absolute right-3 top-3 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => {
                setShowCardModal(false);
                try { cardInstanceRef.current?.teardown?.(); } catch {}
                setSelectedPlan(null);
              }}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-semibold mb-4">Enter card details</h3>

            <div className="space-y-4">
              <div id="pp-card-name" className="border rounded-md p-3" />
              <div id="pp-card-number" className="border rounded-md p-3" />
              <div className="grid grid-cols-2 gap-3">
                <div id="pp-card-expiry" className="border rounded-md p-3" />
                <div id="pp-card-cvv" className="border rounded-md p-3" />
              </div>
            </div>

            <Button
              className="mt-6 w-full"
              disabled={loading}
              onClick={() => {
                try {
                  cardInstanceRef.current?.submit();
                } catch (e) {
                  console.error(e);
                  toast({
                    title: "Payment error",
                    description: "Could not submit card form.",
                    variant: "destructive",
                  });
                }
              }}
            >
              {loading ? "Processing…" : "Subscribe"}
            </Button>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
};

export default PlanSelection;
