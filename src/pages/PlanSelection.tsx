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

type BillingPlanRow = {
  id: string;
  plan_type: "starter" | "professional" | "enterprise" | string;
  provider: string; // "paypal"
  provider_plan_id: string; // PayPal Plan ID (P-... )
  price_cents: number;
  currency: string; // e.g. "USD"
  interval: string; // e.g. "month"
};

type PayPalConfig = {
  clientId: string;
};

const PLANS_UI = [
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
    popular: false,
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
    popular: false,
  },
] as const;

export default function PlanSelection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plansMap, setPlansMap] = useState<Record<string, BillingPlanRow>>({});
  const [paypalCfg, setPaypalCfg] = useState<PayPalConfig | null>(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Prevent rendering a button twice
  const rendered = useRef<Record<string, boolean>>({});

  // Load PayPal clientId from your Supabase Edge Function
  const fetchPayPalConfig = async (): Promise<PayPalConfig> => {
    const res = await supabase.functions.invoke("paypal-create-subscription", {
      body: { action: "get_config" }, // <-- your function should return { clientId }
    });
    if (res.error) throw new Error(res.error.message || "Failed to get PayPal config");
    const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    if (!data?.clientId) throw new Error("Missing clientId from get_config");
    return { clientId: data.clientId as string };
  };

  // Load PayPal SDK
  const ensurePayPalSdk = async (clientId: string) => {
    if (window.paypal) return;
    const src =
      "https://www.paypal.com/sdk/js" +
      `?client-id=${encodeURIComponent(clientId)}` +
      `&components=buttons` +
      `&vault=true` +
      `&intent=subscription`;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load PayPal SDK"));
      document.head.appendChild(s);
    });
  };

  // Pull plan IDs from your DB: billing_plans
  const loadPlansFromDb = async () => {
    const { data, error } = await supabase
      .from("billing_plans")
      .select("id,plan_type,provider,provider_plan_id,price_cents,currency,interval")
      .in("plan_type", ["starter", "professional", "enterprise"])
      .eq("provider", "paypal");

    if (error) throw error;

    const map: Record<string, BillingPlanRow> = {};
    for (const row of (data || [])) {
      if (row.provider_plan_id) map[row.plan_type] = row as BillingPlanRow;
    }
    setPlansMap(map);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (authLoading) return;
      if (!user) return; // keep your existing auth gate

      try {
        await loadPlansFromDb();
        const cfg = await fetchPayPalConfig();
        if (cancelled) return;
        setPaypalCfg(cfg);
        await ensurePayPalSdk(cfg.clientId);
        if (cancelled) return;
        setSdkLoaded(true);
      } catch (e: any) {
        console.error(e);
        toast({
          title: "Setup error",
          description: e?.message || "Could not initialize PayPal",
          variant: "destructive",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // Render one PayPal button per plan (opens hosted PayPal checkout)
  useEffect(() => {
    if (!sdkLoaded || !paypalCfg) return;
    if (!user) return;

    PLANS_UI.forEach((p) => {
      const containerId = `paypal-button-${p.id}`;
      const el = document.getElementById(containerId);
      if (!el) return;
      if (rendered.current[p.id]) return;

      const dbPlan = plansMap[p.id];
      if (!dbPlan?.provider_plan_id) {
        el.innerHTML = `<div style="color:#b00020;font-size:12px;">Missing PayPal plan for ${p.id}</div>`;
        return;
      }

      window.paypal
        .Buttons({
          style: { label: "subscribe", layout: "horizontal", height: 45 },
          createSubscription: (_data: any, actions: any) => {
            return actions.subscription.create({
              plan_id: dbPlan.provider_plan_id, // <-- from billing_plans
            });
          },
          onApprove: (data: any) => {
            const subId = data?.subscriptionID || data?.subscriptionId;
            if (subId) {
              navigate(`/billing/success?subscription_id=${encodeURIComponent(subId)}`);
            } else {
              navigate(`/billing/success`);
            }
          },
          onCancel: () => {
            navigate(`/billing/cancel`);
          },
          onError: (err: any) => {
            console.error("PayPal button error:", err);
            // keep UI simple: toast + let user click again
            toast({
              title: "Payment error",
              description: err?.message || "PayPal error",
              variant: "destructive",
            });
          },
        })
        .render(`#${containerId}`);

      rendered.current[p.id] = true;
    });
  }, [sdkLoaded, paypalCfg, plansMap, user, navigate, toast]);

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
              {PLANS_UI.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative transition-all hover:shadow-lg ${
                    plan.popular ? "border-primary shadow-lg scale-105" : ""
                  }`}
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

                    {/* OFFICIAL PayPal Button mounts here (opens hosted checkout) */}
                    <div id={`paypal-button-${plan.id}`} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
