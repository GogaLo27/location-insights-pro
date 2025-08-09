/* src/pages/PlanSelection.tsx */
import { useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CheckCircle, MapPin, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

type PlanId = "starter" | "professional" | "enterprise";

const plans: Array<{
  id: PlanId; name: string; price: string; description: string;
  features: string[]; locations: number; reviews: number; popular?: boolean;
}> = [
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

export default function PlanSelection() {
  const { user, loading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

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

  const handlePlanSelect = async (planType: PlanId) => {
    if (!user) return;
    setSelectedPlan(planType);
    setLoadingPlan(planType);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token || "";

      // Call our edge function to create a PayPal subscription and return approval URL
      const res = await supabase.functions.invoke("paypal-create-subscription", {
        body: {
          plan_type: planType,
          return_url: `${window.location.origin}/billing/success`,
          cancel_url: `${window.location.origin}/billing/cancel`,
        },
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.error) throw new Error(res.error.message || "Edge function error");
      let payload: any = res.data;
      if (typeof payload === "string") { try { payload = JSON.parse(payload); } catch {} }

      const approvalUrl = payload?.approval_url;
      if (!approvalUrl) throw new Error("No approval_url returned from server");

      if (payload?.subscription_id) {
        // optional: your success page can poll using this id
        localStorage.setItem("pendingSubId", payload.subscription_id);
      }

      // ✅ Redirect to PayPal’s hosted approval page (will show PayPal’s own card form)
      window.location.href = approvalUrl;
    } catch (e: any) {
      toast({
        title: "Payment error",
        description: e.message || "Failed to start checkout",
        variant: "destructive",
      });
      setLoadingPlan(null);
      setSelectedPlan(null);
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
                      onClick={() => handlePlanSelect(plan.id)}
                      disabled={loadingPlan === plan.id}
                    >
                      {loadingPlan === plan.id ? "Redirecting…" : "Select Plan"}
                    </Button>
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
