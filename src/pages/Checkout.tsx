import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, ArrowLeft, Check, Plus, QrCode, KeyRound } from "lucide-react";
import { useBillingPlans } from "@/hooks/useBillingPlans";
import { useAuth } from "@/components/ui/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageOrbs } from "@/components/PageLayout";

interface SavedCard {
  id: string;
  card_token: string;
  card_mask: string | null;
  card_brand: string | null;
  last_4_digits: string | null;
  is_default: boolean;
}

type PaymentMethod = "keepz_saved" | "keepz_direct" | "keepz_card";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const planType = searchParams.get("plan") || "professional";
  const isUpgrade = searchParams.get("upgrade") === "true";

  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("keepz_saved");
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [loadingCards, setLoadingCards] = useState(true);

  // QR modal state (Keepz direct pay)
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [qrSubscriptionId, setQrSubscriptionId] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { plans: keepzPlans, loading: plansLoading } = useBillingPlans('keepz');
  const selectedPlan = keepzPlans.find(p => p.plan_type === planType);

  const plan = selectedPlan
    ? {
        id: selectedPlan.id,
        name: selectedPlan.plan_name,
        price: selectedPlan.price_cents / 100,
        currency: selectedPlan.currency || 'GEL',
        interval: selectedPlan.interval || 'month',
        features: selectedPlan.features || [],
      }
    : { id: '', name: 'Loading...', price: 0, currency: 'GEL', interval: 'month', features: [] };

  const currencySymbol = plan.currency === 'GEL' ? '₾' : plan.currency === 'EUR' ? '€' : '$';

  useEffect(() => {
    const fetchSavedCards = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("user_payment_methods")
          .select("id, card_token, card_mask, card_brand, last_4_digits, is_default")
          .eq("user_id", user.id)
          .neq("card_mask", "pending")
          .order("is_default", { ascending: false });
        if (error) throw error;
        setSavedCards(data || []);
        const defaultCard = data?.find(c => c.is_default);
        if (defaultCard) setSelectedCardId(defaultCard.id);
        else if (data && data.length > 0) setSelectedCardId(data[0].id);
        // If no saved cards, default to card entry
        if (!data || data.length === 0) setSelectedPayment("keepz_card");
      } catch (err) {
        console.error("Error fetching saved cards:", err);
      } finally {
        setLoadingCards(false);
      }
    };
    fetchSavedCards();
  }, [user]);

  // Clean up poll on unmount
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const startPolling = (subscriptionId: string) => {
    let elapsed = 0;
    const POLL_INTERVAL = 3000;
    const MAX_WAIT = 10 * 60 * 1000; // 10 minutes

    pollRef.current = setInterval(async () => {
      elapsed += POLL_INTERVAL;
      if (elapsed >= MAX_WAIT) {
        clearInterval(pollRef.current!);
        setShowQrModal(false);
        toast({ title: "Payment timed out", description: "Please try again.", variant: "destructive" });
        return;
      }
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('id', subscriptionId)
        .single();
      if (sub?.status === 'active') {
        clearInterval(pollRef.current!);
        setShowQrModal(false);
        toast({ title: "Payment successful!", description: "Your subscription is now active." });
        navigate('/dashboard');
      }
    }, POLL_INTERVAL);
  };

  const handleKeepzDirectPayment = async () => {
    if (!selectedPlan) {
      toast({ title: "Error", description: "Plan not found", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data, error } = await supabase.functions.invoke("keepz-direct-charge", {
        body: { plan_type: planType, billing_plan_id: selectedPlan.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.qr_url) throw new Error("No QR code returned");

      setQrUrl(data.qr_url);
      setQrSubscriptionId(data.subscription_id);
      setShowQrModal(true);
      startPolling(data.subscription_id);
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message || "Failed to initiate payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeepzSavedCardPayment = async () => {
    if (!selectedCardId) {
      toast({ title: "Select a Card", description: "Please select a saved card or add a new one", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data, error } = await supabase.functions.invoke("keepz-charge-saved-card", {
        body: {
          plan_type: planType,
          payment_method_id: selectedCardId,
          return_url: `${window.location.origin}/billing-success`,
          cancel_url: `${window.location.origin}/checkout?plan=${planType}`,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else if (data?.success) {
        toast({ title: "Payment Processing", description: "Your payment is being processed. Redirecting..." });
        setTimeout(() => navigate("/billing-success"), 2000);
      } else {
        throw new Error("Payment failed");
      }
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message || "Failed to process payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeepzCardPayment = async () => {
    if (!selectedPlan) {
      toast({ title: "Error", description: "Plan not found", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data, error } = await supabase.functions.invoke("keepz-direct-card-payment", {
        body: {
          plan_type: planType,
          billing_plan_id: selectedPlan.id,
          return_url: `${window.location.origin}/billing-success`,
          cancel_url: `${window.location.origin}/checkout?plan=${planType}`,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.payment_url) throw new Error("No payment URL returned");

      window.location.href = data.payment_url;
    } catch (error: any) {
      toast({ title: "Payment Error", description: error.message || "Failed to initiate payment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (selectedPayment === "keepz_card") {
      handleKeepzCardPayment();
    } else if (selectedPayment === "keepz_direct") {
      handleKeepzDirectPayment();
    } else {
      handleKeepzSavedCardPayment();
    }
  };

  const handleCancelQr = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setShowQrModal(false);
  };

  if (plansLoading || loadingCards) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 py-12 px-4">
      <PageOrbs />
      <div className="max-w-4xl mx-auto relative">
        <Button variant="ghost" className="text-slate-400 hover:text-white mb-6" onClick={() => navigate(-1)}>
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
                    <p className="text-sm text-slate-400">{plan.interval === 'week' ? 'Weekly' : 'Monthly'} subscription</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{currencySymbol}{plan.price}</p>
                    <p className="text-sm text-slate-400">/{plan.interval === 'week' ? 'week' : 'month'}</p>
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
                    <span className="text-xl font-bold text-white">{currencySymbol}{plan.price}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    You'll be charged {currencySymbol}{plan.price} {plan.interval === 'week' ? 'weekly' : 'monthly'}. Cancel anytime.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Payment Method</CardTitle>
              <CardDescription className="text-slate-400">Choose how you'd like to pay</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Keepz Card Entry — always available, no save, redirect to Credo */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPayment === "keepz_card"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                  onClick={() => setSelectedPayment("keepz_card")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Pay by Card</p>
                        <p className="text-sm text-slate-400">Enter card details — no account needed</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment === "keepz_card" ? "border-blue-500 bg-blue-500" : "border-slate-500"
                    }`}>
                      {selectedPayment === "keepz_card" && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>

                {/* Keepz Direct (QR scan) — always available */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedPayment === "keepz_direct"
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                  onClick={() => setSelectedPayment("keepz_direct")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Pay via QR Code</p>
                        <p className="text-sm text-slate-400">Scan with Keepz app — no card save needed</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPayment === "keepz_direct" ? "border-blue-500 bg-blue-500" : "border-slate-500"
                    }`}>
                      {selectedPayment === "keepz_direct" && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>

                {/* Keepz Saved Card — shown only if user has saved cards */}
                {savedCards.length > 0 && (
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPayment === "keepz_saved"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                    onClick={() => setSelectedPayment("keepz_saved")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-white">Saved Card</p>
                          <p className="text-sm text-slate-400">{savedCards.length} card{savedCards.length > 1 ? 's' : ''} on file</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPayment === "keepz_saved" ? "border-blue-500 bg-blue-500" : "border-slate-500"
                      }`}>
                        {selectedPayment === "keepz_saved" && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>

                    {selectedPayment === "keepz_saved" && (
                      <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                        <label className="text-sm text-slate-300">Select Card</label>
                        <Select value={selectedCardId} onValueChange={setSelectedCardId}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Select a card" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            {savedCards.map((card) => (
                              <SelectItem key={card.id} value={card.id} className="text-white hover:bg-slate-600">
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
                          onClick={(e) => { e.stopPropagation(); navigate("/payment-methods"); }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add new card
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                  disabled={loading || (selectedPayment === "keepz_saved" && !selectedCardId)}
                  onClick={handlePayment}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <>Pay {currencySymbol}{plan.price}</>
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

      {/* Keepz QR Payment Modal */}
      <Dialog open={showQrModal} onOpenChange={(open) => { if (!open) handleCancelQr(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to Complete Payment</DialogTitle>
            <DialogDescription>
              Open your Keepz app and scan this QR code to complete your {plan.name} subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrUrl ? (
              <img src={qrUrl} alt="Keepz QR Code" className="w-52 h-52 rounded-lg border border-border" />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center bg-muted rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for payment confirmation...
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelQr}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
