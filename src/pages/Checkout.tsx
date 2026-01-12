import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ArrowLeft, Check, Plus, ChevronDown } from "lucide-react";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useAuth } from "@/components/ui/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SavedCard {
  id: string;
  card_token: string;
  card_mask: string | null;
  card_brand: string | null;
  last_4_digits: string | null;
  is_default: boolean;
}

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const planType = searchParams.get("plan") || "professional";
  const isUpgrade = searchParams.get("upgrade") === "true";
  
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<"keepz" | "paypal" | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [loadingCards, setLoadingCards] = useState(true);

  // Fetch plans from database
  const { plans: paypalPlans, loading: plansLoading } = useBillingPlans('paypal');
  
  // Find the selected plan from database
  const selectedPlan = paypalPlans.find(p => p.plan_type === planType);
  
  // Plan details from database
  const plan = selectedPlan ? {
    name: selectedPlan.plan_name,
    price: selectedPlan.price_cents / 100,
    features: selectedPlan.features || []
  } : { name: "Loading...", price: 0, features: [] };

  // Fetch saved cards
  useEffect(() => {
    const fetchSavedCards = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("user_payment_methods")
          .select("*")
          .eq("user_id", user.id)
          .neq("card_mask", "pending")
          .order("is_default", { ascending: false });

        if (error) throw error;
        
        setSavedCards(data || []);
        
        // Auto-select default card
        const defaultCard = data?.find(c => c.is_default);
        if (defaultCard) {
          setSelectedCardId(defaultCard.id);
        } else if (data && data.length > 0) {
          setSelectedCardId(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching saved cards:", err);
      } finally {
        setLoadingCards(false);
      }
    };

    fetchSavedCards();
  }, [user]);

  const handleKeepzPaymentWithSavedCard = async () => {
    if (!selectedCardId) {
      toast({
        title: "Select a Card",
        description: "Please select a saved card or add a new one",
        variant: "destructive"
      });
      return;
    }

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

      const { data, error } = await supabase.functions.invoke("keepz-charge-saved-card", {
        body: {
          plan_type: planType,
          payment_method_id: selectedCardId,
          return_url: `${window.location.origin}/billing-success`,
          cancel_url: `${window.location.origin}/checkout?plan=${planType}`,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // If there's a payment URL (shouldn't be for saved cards, but just in case)
      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else if (data?.success) {
        toast({
          title: "Payment Processing",
          description: "Your payment is being processed. Redirecting...",
        });
        // Redirect to success page
        setTimeout(() => {
          navigate("/billing-success");
        }, 2000);
      } else {
        throw new Error("Payment failed");
      }
    } catch (error: any) {
      console.error("Keepz payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process payment",
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
      handleKeepzPaymentWithSavedCard();
    } else if (selectedPayment === "paypal") {
      handlePayPalPayment();
    }
  };

  const handleAddNewCard = () => {
    navigate("/payment-methods");
  };

  // Check if Keepz payment is possible
  const canPayWithKeepz = savedCards.length > 0 && selectedCardId;

  if (plansLoading || loadingCards) {
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
                {/* Keepz Option with Saved Cards */}
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
                        <p className="font-medium text-white">Credit/Debit Card</p>
                        <p className="text-sm text-slate-400">
                          {savedCards.length > 0 
                            ? `${savedCards.length} saved card${savedCards.length > 1 ? 's' : ''}`
                            : "No saved cards"
                          }
                        </p>
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

                  {/* Saved Cards Dropdown - shown when Keepz is selected */}
                  {selectedPayment === "keepz" && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      {savedCards.length > 0 ? (
                        <div className="space-y-3">
                          <label className="text-sm text-slate-300">Select Card</label>
                          <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                              <SelectValue placeholder="Select a card" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              {savedCards.map((card) => (
                                <SelectItem 
                                  key={card.id} 
                                  value={card.id}
                                  className="text-white hover:bg-slate-600"
                                >
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    {card.card_brand || 'Card'} •••• {card.last_4_digits || '****'}
                                    {card.is_default && <span className="text-xs text-blue-400">(Default)</span>}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 p-0 h-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddNewCard();
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add new card
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-sm text-slate-400 mb-3">
                            You need to add a payment method first
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddNewCard();
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Payment Method
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
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
                  disabled={
                    !selectedPayment || 
                    loading || 
                    (selectedPayment === "keepz" && !canPayWithKeepz)
                  }
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

                {selectedPayment === "keepz" && !canPayWithKeepz && (
                  <p className="text-xs text-center text-amber-400">
                    Please add a payment method to continue with card payment
                  </p>
                )}

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
