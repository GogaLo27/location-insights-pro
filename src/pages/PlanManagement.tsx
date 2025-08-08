import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Crown, Zap, Building } from "lucide-react";

interface UserPlan {
  id: string;
  plan_type: string;
  created_at: string;
}

const PlanManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCurrentPlan();
    }
  }, [user]);

  const fetchCurrentPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('user_plans')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCurrentPlan(data);
    } catch (error) {
      console.error('Error fetching plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_plans')
        .upsert({
          user_id: user.id,
          plan_type: planType,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Plan Updated",
        description: `You've successfully switched to the ${planType} plan.`,
      });

      fetchCurrentPlan();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Error",
        description: "Failed to update plan.",
        variant: "destructive",
      });
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      description: 'Perfect for small businesses',
      icon: Zap,
      features: ['Up to 3 locations', 'Basic analytics', 'Review monitoring', 'Email support'],
      current: currentPlan?.plan_type === 'starter'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$79',
      description: 'Ideal for growing businesses',
      icon: Crown,
      features: ['Up to 10 locations', 'Advanced analytics', 'AI review analysis', 'Priority support', 'Custom reports'],
      current: currentPlan?.plan_type === 'professional',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$199',
      description: 'For large organizations',
      icon: Building,
      features: ['Unlimited locations', 'Full analytics suite', 'AI-powered insights', '24/7 support', 'Custom integrations', 'Dedicated account manager'],
      current: currentPlan?.plan_type === 'enterprise'
    }
  ];

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading plans...</p>
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
            <div className="flex items-center space-x-4 ml-4">
              <h1 className="text-xl font-semibold">Plan Management</h1>
            </div>
          </header>
          
          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Manage Your Plan</h1>
              <p className="text-muted-foreground">
                Upgrade or downgrade your plan to fit your business needs
              </p>
            </div>

            {currentPlan && (
              <Card className="mb-6 border-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="default" className="bg-accent text-white">
                      Current Plan
                    </Badge>
                    {currentPlan.plan_type.charAt(0).toUpperCase() + currentPlan.plan_type.slice(1)}
                  </CardTitle>
                  <CardDescription>
                    Active since {new Date(currentPlan.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const IconComponent = plan.icon;
                return (
                  <Card key={plan.id} className={`relative ${plan.popular ? 'border-accent shadow-lg' : ''} ${plan.current ? 'bg-accent/5' : ''}`}>
                    {plan.popular && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-accent text-white">
                        Most Popular
                      </Badge>
                    )}
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
                        <IconComponent className="h-6 w-6 text-accent" />
                      </div>
                      <CardTitle className="flex items-center justify-center gap-2">
                        {plan.name}
                        {plan.current && <Badge variant="outline">Current</Badge>}
                      </CardTitle>
                      <div className="text-3xl font-bold text-accent">{plan.price}<span className="text-sm text-muted-foreground">/month</span></div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center">
                            <Check className="h-4 w-4 text-accent mr-2 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button 
                        className="w-full" 
                        variant={plan.current ? "outline" : plan.popular ? "default" : "outline"}
                        disabled={plan.current}
                        onClick={() => handlePlanChange(plan.id)}
                      >
                        {plan.current ? 'Current Plan' : `Switch to ${plan.name}`}
                      </Button>
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

export default PlanManagement;