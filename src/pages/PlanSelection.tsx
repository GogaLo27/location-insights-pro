import { useEffect, useRef, useState } from "react";
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
import { CheckCircle, MapPin, Star } from "lucide-react";
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
  const s = document.createElement("script");
  // Official PayPal SDK with the official Card Fields component
  s.src =
    `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
    `&components=card-fields&vault=true&intent=subscription`;
  s.async = true;
  document.body.appendChild(s);
  await new Promise<void>((resolve, reject) => {
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal SDK failed to load"));
  });
};

export default function PlanSelection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [ppCfg, setPpCfg] = useState<PayPalConfig | null>(null);
  const [showCardBlock, setShowCardBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // PayPal card instance (official component)
  const cardRef = useRef<any>(null);

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: "$29",
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
  ];

  const ensurePayPal = async () => {
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

  // Render PayPal's official Card Fields block into the placeholders
  const renderPayPalCardFields = async () => {
    const paypal = window.paypal;
    if (!paypal) throw new Error("PayPal SDK not available");

    // Always tear down any existing instance
    try { cardRef.current?.teardown?.(); } catch {}
    cardRef.current = null;

    // createVaultSetupToken MUST come from server (we do NOT collect card data)
    const createVaultSetupToken = async () => {
      const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
        body: { action: "create_setup_token" },
      });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (!payload?.id) throw new Error("Failed to create setup token");
      return payload.id as string;
    };

    const card = paypal.CardFields({
      createVaultSetupToken,
      onApprove: async ({ vaultSetupToken }: { vaultSetupToken: string }) => {
        // Server exchanges setup token -> payment token and creates the subscription
        try {
          setSubmitting(true);
          const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
            body: {
              action: "create_subscription_with_vault",
              plan_type: selectedPlan,
              vault_setup_token: vaultSetupToken,
            },
          });
          if (error) throw error;
          const res = typeof data === "string" ? JSON.parse(data) : data;
          if (res?.subscription_id) {
            localStorage.setItem("pendingSubId", res.local_subscription_id || "");
            navigate(`/billing/success?subscription_id=${res.subscription_id}`);
            return;
          }
          throw new Error("Unexpected response from server");
        } catch (e: any) {
          console.error(e);
          toast({
            title: "Payment error",
            description: e?.message || "Failed to create subscription",
            variant: "destructive",
          });
        } finally {
          setSubmitting(false);
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

    // OFFICIAL fields (PayPal renders the inputs)
    if (!card.isEligible()) {
      throw new Error("PayPal card fields not eligible for this buyer.");
    }
    card.NameField().render("#pp-name");
    card.NumberField().render("#pp-number");
    card.ExpiryField().render("#pp-expiry");
    card.CVVField().render("#pp-cvv");

    cardRef.current = card;
  };

  const startCardFlow = async (planType: string) => {
    if (!user) return;
    setSelectedPlan(planType);
    try {
      await ensurePayPal();
      setShowCardBlock(true);
      // Wait a tick for containers to mount
      setTimeout(() => {
        renderPayPalCardFields().catch((e) => {
          console.error(e);
          toast({
            title: "Payment error",
            description: e?.message || "Unable to load PayPal card form.",
            variant: "destructive",
          });
          setShowCardBlock(false);
          setSelectedPlan(null);
        });
      }, 50);
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Payment error",
        description: e?.message || "Unable to initialize PayPal.",
        variant: "destructive",
      });
      setSelectedPlan(null);
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

            {/* Plans */}
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
                      disabled={!!selectedPlan && selectedPlan !== plan.id}
                      onClick={() => startCardFlow(plan.id)}
                    >
                      {selectedPlan === plan.id && showCardBlock ? "Card form below" : "Pay by Card"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* OFFICIAL PayPal Card Fields (inline, no custom inputs) */}
            {showCardBlock && (
              <div className="max-w-3xl mx-auto mt-10 border rounded-xl p-6">
                <div className="mb-4">
                  <div className="text-lg font-semibold">Card details (secured by PayPal)</div>
                  <div className="text-sm text-muted-foreground">
                    We never see or store your card information. The fields below are rendered by PayPal.
                  </div>
                </div>

                {/* Empty containers – PayPal renders the official inputs here */}
                <div className="space-y-4">
                  <div id="pp-name" className="border rounded-md p-3" />
                  <div id="pp-number" className="border rounded-md p-3" />
                  <div className="grid grid-cols-2 gap-3">
                    <div id="pp-expiry" className="border rounded-md p-3" />
                    <div id="pp-cvv" className="border rounded-md p-3" />
                  </div>
                </div>

                <Button
                  className="mt-6"
                  disabled={submitting}
                  onClick={() => {
                    try { cardRef.current?.submit(); } catch (e) {
                      console.error(e);
                      toast({
                        title: "Payment error",
                        description: "Could not submit PayPal card form.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  {submitting ? "Processing…" : "Subscribe"}
                </Button>
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
