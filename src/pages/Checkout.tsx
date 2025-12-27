import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ArrowLeft, Check } from "lucide-react";
import { useBillingPlans } from "@/hooks/useBillingPlans";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const planType = searchParams.get("plan") || "professional";
  const isUpgrade = searchParams.get("upgrade") === "true";
  
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<"keepz" | "paypal" | null>(null);

  // Fetch plans from database - no hardcoding!
  const { plans: paypalPlans, loading: plansLoading } = useBillingPlans('paypal');
  
  // Find the selected plan from database
  const selectedPlan = paypalPlans.find(p => p.plan_type === planType);
  
  // Plan details from database
  const plan = selectedPlan ? {
    name: selectedPlan.plan_name,
    price: selectedPlan.price_cents / 100,
    features: selectedPlan.features || []
  } : { name: "Loading...", price: 0, features: [] };

  const handleKeepzPayment = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to continue",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("keepz-create-subscription", {
        body: {
          plan_type: planType,
          return_url: `${window.location.origin}/billing-success`,
          cancel_url: `${window.location.origin}/checkout?plan=${planType}`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("Keepz payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayPalPayment = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Error",
          description: "Please log in to continue",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("paypal-create-subscription", {
        body: {
          plan_type: planType,
          return_url: `${window.location.origin}/billing-success`,
          cancel_url: `${window.location.origin}/checkout?plan=${planType}`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // PayPal returns checkout_url
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data?.approval_url) {
        window.location.href = data.approval_url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error: any) {
      console.error("PayPal payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (selectedPayment === "keepz") {
      handleKeepzPayment();
    } else if (selectedPayment === "paypal") {
      handlePayPalPayment();
    }
  };

  if (plansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Order Summary</CardTitle>
              <CardDescription className="text-slate-400">
                {isUpgrade ? "Upgrade your subscription" : "Start your subscription"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-slate-700">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <p className="text-sm text-slate-400">Monthly subscription</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${plan.price}</p>
                    <p className="text-sm text-slate-400">/month</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-300">What's included:</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-slate-400">
                        <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total today</span>
                    <span className="text-xl font-bold text-white">${plan.price}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    You'll be charged ${plan.price} monthly. Cancel anytime.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Payment Method</CardTitle>
              <CardDescription className="text-slate-400">
                Choose your preferred payment method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Keepz Option */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPayment === "keepz"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                  onClick={() => setSelectedPayment("keepz")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Keepz</p>
                        <p className="text-sm text-slate-400">Credit/Debit Card</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPayment === "keepz"
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-500"
                    }`}>
                      {selectedPayment === "keepz" && (
                        <Check className="w-full h-full text-white p-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* PayPal Option */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPayment === "paypal"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                  onClick={() => setSelectedPayment("paypal")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#003087] flex items-center justify-center">
                        <span className="text-white font-bold text-sm">PP</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">PayPal</p>
                        <p className="text-sm text-slate-400">Pay with PayPal</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedPayment === "paypal"
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-500"
                    }`}>
                      {selectedPayment === "paypal" && (
                        <Check className="w-full h-full text-white p-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Pay Button */}
                <Button
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                  disabled={!selectedPayment || loading}
                  onClick={handlePayment}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Pay ${plan.price}</>
                  )}
                </Button>

                <p className="text-xs text-center text-slate-500">
                  By completing this purchase, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

