import { useRef, useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CheckCircle, MapPin, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    paypal?: any;
  }
}

type PayPalConfig = { clientId: string; environment: "sandbox" | "live" };

const loadPayPalSdk = async (clientId: string) => {
  if (window.paypal) return;
  const s = document.createElement("script");
  // Only PayPal UI: Card Fields + Buttons; force buyer-country (helps sandbox eligibility)
  s.src =
    `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}` +
    `&components=card-fields,buttons` +
    `&vault=true&intent=subscription` +
    `&buyer-country=US` +                    // <-- important for sandbox testing
    `&disable-funding=paypal,venmo`;         // optional: hide wallet buttons so only card shows
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
  const [showPayPalBlock, setShowPayPalBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  // PayPal instances
  const cardFieldsRef = useRef<any>(null);
  const buttonsRef = useRef<any>(null);

  const plans = [
    { id: "starter", name: "Starter", price: "$29", description: "Perfect for small businesses", features: ["Up to 3 locations","Basic analytics","Review monitoring","Email support"], locations: 3, reviews: 100 },
    { id: "professional", name: "Professional", price: "$79", description: "For growing businesses", features: ["Up to 10 locations","Advanced analytics","AI review analysis","Priority support","Custom reports"], locations: 10, reviews: 500, popular: true },
    { id: "enterprise", name: "Enterprise", price: "$199", description: "For enterprises", features: ["Unlimited locations","Full analytics suite","AI-powered insights","24/7 support","Custom integrations","Dedicated account manager"], locations: -1, reviews: -1 },
  ];

  const ensurePayPal = async () => {
    if (ppCfg) return ppCfg;
    const { data, error } = await supabase.functions.invoke("paypal-create-subscription", { body: { action: "get_config" } });
    if (error) throw error;
    const cfg: PayPalConfig = typeof data === "string" ? JSON.parse(data) : data;
    await loadPayPalSdk(cfg.clientId);
    setPpCfg(cfg);
    return cfg;
  };

  const mountPayPalUI = async (planType: string) => {
    const paypal = window.paypal;
    if (!paypal) throw new Error("PayPal SDK not available");

    // teardown previous
    try { cardFieldsRef.current?.teardown?.(); } catch {}
    try { buttonsRef.current?.close?.(); } catch {}
    cardFieldsRef.current = null;
    buttonsRef.current = null;

    // server makes setup token (we never touch card data)
    const createVaultSetupToken = async () => {
      const { data, error } = await supabase.functions.invoke("paypal-create-subscription", { body: { action: "create_setup_token" } });
      if (error) throw error;
      const payload = typeof data === "string" ? JSON.parse(data) : data;
      if (!payload?.id) throw new Error("Failed to create setup token");
      return payload.id as string;
    };

    // OFFICIAL card fields
    const cardFields = paypal.CardFields({
      createVaultSetupToken,
      onApprove: async ({ vaultSetupToken }: { vaultSetupToken: string }) => {
        try {
          setBusy(true);
          const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
            body: { action: "create_subscription_with_vault", plan_type: planType, vault_setup_token: vaultSetupToken },
          });
          if (error) throw error;
          const res = typeof data === "string" ? JSON.parse(data) : data;
          if (res?.subscription_id) {
            localStorage.setItem("pendingSubId", res.local_subscription_id || "");
            navigate(`/billing/success?subscription_id=${res.subscription_id}`);
            return;
          }
          throw new Error("Unexpected server response");
        } catch (e: any) {
          toast({ title: "Payment error", description: e?.message || "Failed to create subscription", variant: "destructive" });
        } finally { setBusy(false); }
      },
      onError: (err: any) => {
        toast({ title: "PayPal error", description: "Card form error. Try again.", variant: "destructive" });
        console.error(err);
      },
    });

    // Eligibility check (this is where your error came from)
    if (!cardFields.isEligible()) {
      throw new Error("PayPal card fields not eligible for this buyer.");
    }

    // Mount into empty containers — NO custom inputs, PayPal renders iframes
    cardFields.NameField().render("#pp-name");
    cardFields.NumberField().render("#pp-number");
    cardFields.ExpiryField().render("#pp-expiry");
    cardFields.CVVField().render("#pp-cvv");
    cardFieldsRef.current = cardFields;

    // OFFICIAL PayPal button for CARD funding; it triggers cardFields.submit()
    const buttons = paypal.Buttons({
      fundingSource: paypal.FUNDING.CARD,
      style: { label: "pay", shape: "pill" },
      onClick: async () => {
        try { await cardFields.submit(); } catch {}
      },
      onError: (err: any) => console.error("Buttons error:", err),
    });

    buttons.render("#pp-card-button");
    buttonsRef.current = buttons;
  };

  const start = async (planType: string) => {
    if (!user) return;
    setSelectedPlan(planType);
    try {
      await ensurePayPal();
      setShowPayPalBlock(true);
      setTimeout(() => {
        mountPayPalUI(planType).catch((e) => {
          console.error(e);
          setShowPayPalBlock(false);
          setSelectedPlan(null);
          // surface a readable reason
          const msg = e?.message || String(e);
          if (msg.includes("not eligible")) {
            toast({
              title: "PayPal card not eligible",
              description: "Enable Advanced Cards + Vault on your PayPal app OR set buyer-country to a supported region for sandbox.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Payment error", description: msg, variant: "destructive" });
          }
        });
      }, 50);
    } catch (e: any) {
      console.error(e);
      toast({ title: "PayPal init failed", description: e?.message || "Could not load PayPal SDK", variant: "destructive" });
      setSelectedPlan(null);
    }
  };

  if (!user && !authLoading) return <Navigate to="/" replace />;

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
                Choose the perfect plan for your business needs.
              </p>
            </div>

            {/* Plans */}
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <Card key={plan.id} className={`relative transition-all hover:shadow-lg ${plan.popular ? "border-primary shadow-lg scale-105" : ""} ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""}`}>
                  {plan.popular && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">Most Popular</Badge>}
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="text-3xl font-bold">
                      {plan.price}<span className="text-base font-normal text-muted-foreground">/month</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2"><MapPin className="w-4 h-4 text-primary" /><span className="font-medium">{plan.locations === -1 ? "Unlimited locations" : `Up to ${plan.locations} locations`}</span></div>
                      <div className="flex items-center space-x-2"><Star className="w-4 h-4 text-primary" /><span className="font-medium">{plan.reviews === -1 ? "Unlimited reviews" : `Up to ${plan.reviews} reviews`}</span></div>
                    </div>
                    <div className="space-y-2">
                      {plan.features.map((f, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-primary" /><span className="text-sm">{f}</span>
                        </div>
                      ))}
                    </div>
                    <button className="w-full h-10 rounded-md border border-primary/40 hover:bg-primary/5 transition" disabled={!!selectedPlan && selectedPlan !== plan.id} onClick={() => start(plan.id)}>
                      Pay with card (PayPalსსს)
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* OFFICIAL PayPal UI — empty containers only; PayPal renders iframes/buttons */}
            {showPayPalBlock && (
              <div className="max-w-3xl mx-auto mt-10">
                <div id="pp-name" />
                <div id="pp-number" />
                <div id="pp-expiry" />
                <div id="pp-cvv" />
                <div id="pp-card-button" />
                {busy && <div className="mt-2 text-sm">Processing…</div>}
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
