import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Star, 
  Loader2,
  CheckCircle,
  XCircle,
  Shield
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaymentMethod {
  id: string;
  card_token: string;
  card_mask: string | null;
  card_brand: string | null;
  last_4_digits: string | null;
  expiration_date: string | null;
  is_default: boolean;
  nickname: string | null;
  created_at: string;
}

const PaymentMethods = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [deletingCard, setDeletingCard] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    }
  }, [user]);

  // Handle redirect back from Keepz
  useEffect(() => {
    const saved = searchParams.get('saved');
    if (saved === 'true') {
      toast({
        title: "Card Added",
        description: "Your payment method has been saved successfully!",
      });
      // Remove query params
      navigate('/payment-methods', { replace: true });
      // Refresh the list
      fetchPaymentMethods();
    } else if (saved === 'false') {
      toast({
        title: "Card Not Saved",
        description: "There was an issue saving your card. Please try again.",
        variant: "destructive"
      });
      navigate('/payment-methods', { replace: true });
    }
  }, [searchParams]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_payment_methods")
        .select("*")
        .eq("user_id", user?.id)
        .neq("card_mask", "pending")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (err: any) {
      console.error("Error fetching payment methods:", err);
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async () => {
    try {
      setAddingCard(true);
      
      const { data, error } = await supabase.functions.invoke('keepz-save-card', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: {
          return_url: `${window.location.origin}/payment-methods?saved=true`,
          cancel_url: `${window.location.origin}/payment-methods?saved=false`
        }
      });

      if (error) throw error;

      if (data?.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (err: any) {
      console.error("Error adding card:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to add card",
        variant: "destructive"
      });
      setAddingCard(false);
    }
  };

  const handleDeleteCard = async (card: PaymentMethod) => {
    try {
      setDeletingCard(card.id);
      
      const { error } = await supabase
        .from("user_payment_methods")
        .delete()
        .eq("id", card.id)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({
        title: "Card Removed",
        description: "Payment method has been removed successfully.",
      });

      // If we deleted the default card, make another one default
      if (card.is_default) {
        const remainingCards = paymentMethods.filter(c => c.id !== card.id);
        if (remainingCards.length > 0) {
          await supabase
            .from("user_payment_methods")
            .update({ is_default: true })
            .eq("id", remainingCards[0].id);
        }
      }

      fetchPaymentMethods();
    } catch (err: any) {
      console.error("Error deleting card:", err);
      toast({
        title: "Error",
        description: "Failed to remove card",
        variant: "destructive"
      });
    } finally {
      setDeletingCard(null);
      setCardToDelete(null);
    }
  };

  const handleSetDefault = async (card: PaymentMethod) => {
    try {
      // Remove default from all cards
      await supabase
        .from("user_payment_methods")
        .update({ is_default: false })
        .eq("user_id", user?.id);

      // Set this card as default
      const { error } = await supabase
        .from("user_payment_methods")
        .update({ is_default: true })
        .eq("id", card.id);

      if (error) throw error;

      toast({
        title: "Default Card Updated",
        description: `${card.card_brand || 'Card'} ending in ${card.last_4_digits} is now your default payment method.`,
      });

      fetchPaymentMethods();
    } catch (err: any) {
      console.error("Error setting default:", err);
      toast({
        title: "Error",
        description: "Failed to update default card",
        variant: "destructive"
      });
    }
  };

  const getCardIcon = (brand: string | null) => {
    // Could add specific card brand icons here
    return <CreditCard className="h-8 w-8 text-blue-600" />;
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between pt-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
              <p className="text-muted-foreground mt-1">
                Manage your saved payment methods for subscriptions
              </p>
            </div>
            <Button 
              onClick={handleAddCard} 
              disabled={addingCard}
              className="gap-2"
            >
              {addingCard ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add New Card
            </Button>
          </div>

          {/* Security Notice */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-3 py-4">
              <Shield className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-blue-800">
                Your card details are securely stored by our payment provider. We only store a reference token, not your actual card number.
              </p>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Payment Methods</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add a payment method to subscribe to a plan
                </p>
                <Button onClick={handleAddCard} disabled={addingCard}>
                  {addingCard ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Your First Card
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paymentMethods.map((card) => (
                <Card 
                  key={card.id} 
                  className={`relative transition-all ${
                    card.is_default ? 'ring-2 ring-primary border-primary' : ''
                  }`}
                >
                  {card.is_default && (
                    <Badge className="absolute -top-2 -right-2 gap-1">
                      <Star className="h-3 w-3" /> Default
                    </Badge>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {getCardIcon(card.card_brand)}
                      <div>
                        <CardTitle className="text-lg">
                          {card.card_brand || 'Card'} •••• {card.last_4_digits || '****'}
                        </CardTitle>
                        {card.expiration_date && (
                          <CardDescription>
                            Expires {card.expiration_date}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {card.nickname && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {card.nickname}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {!card.is_default && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSetDefault(card)}
                          className="flex-1"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCardToDelete(card)}
                        disabled={deletingCard === card.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingCard === card.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </SidebarInset>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {cardToDelete?.card_brand || 'this card'} ending in {cardToDelete?.last_4_digits || '****'}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cardToDelete && handleDeleteCard(cardToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default PaymentMethods;

