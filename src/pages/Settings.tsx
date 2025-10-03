import { useEffect, useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEMO_EMAIL } from "@/utils/mockData";
import { 
  Settings as SettingsIcon, 
  CreditCard, 
  User, 
  Shield, 
  Mail,
  Phone,
  MapPin,
  Save,
  Crown,
  Zap,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2
} from "lucide-react";

interface UserPlan {
  id: string;
  plan_type: "starter" | "professional" | "enterprise";
  created_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  company_name?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  created_at: string;
}

const Settings = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Security settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const handleSecuritySettingsUpdate = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // Handle demo user differently
      if (user?.email === DEMO_EMAIL) {
        // For demo users, just update the local state and save to localStorage
        const updatedProfile = {
          ...userProfile,
          two_factor_auth: twoFactorAuth,
          session_timeout: parseInt(sessionTimeout),
          updated_at: new Date().toISOString(),
        };
        setUserProfile(updatedProfile);
        
        // Save to localStorage for demo persistence
        localStorage.setItem('demo_user_profile', JSON.stringify(updatedProfile));
        
        toast({
          title: "Security Settings Updated",
          description: "Your security settings have been successfully updated.",
        });
        
        setSaving(false);
        return;
      }

      // Real user - use Edge Function
      const { data: authData } = await supabase.auth.getSession();
      const jwt = authData.session?.access_token || "";

      const res = await supabase.functions.invoke("update-security-settings", {
        body: {
          two_factor_auth: twoFactorAuth,
          session_timeout: parseInt(sessionTimeout),
        },
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.error) throw new Error(res.error.message);

      toast({
        title: "Security Settings Updated",
        description: "Your security settings have been successfully updated.",
      });

      // Refresh user data
      fetchUserData();
    } catch (error) {
      console.error("Error updating security settings:", error);
      toast({
        title: "Error",
        description: "Failed to update security settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      // Handle demo user differently
      if (user?.email === DEMO_EMAIL) {
        // For demo users, use mock data and localStorage
        const savedProfile = localStorage.getItem('demo_user_profile');
        
        if (savedProfile) {
          const profileData = JSON.parse(savedProfile);
          setUserProfile(profileData);
          setTwoFactorAuth(profileData.two_factor_auth || false);
          setSessionTimeout(profileData.session_timeout?.toString() || "30");
        } else {
          // Create default demo profile
          const defaultProfile = {
            id: user?.id || "demo-user-id",
            email: user?.email || DEMO_EMAIL,
            full_name: "Demo User",
            company_name: "Demo Company",
            phone: "+1 (555) 123-4567",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: "en",
            two_factor_auth: false,
            session_timeout: 30,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setUserProfile(defaultProfile);
          setTwoFactorAuth(false);
          setSessionTimeout("30");
          
          // Save to localStorage
          localStorage.setItem('demo_user_profile', JSON.stringify(defaultProfile));
        }

        // Set demo plan
        setCurrentPlan({
          id: "demo-plan-1",
          plan_type: "professional",
          created_at: new Date().toISOString(),
        });
        
        setLoading(false);
        return;
      }

      // Real user - fetch from database
      // Fetch current plan
      const { data: planData } = await supabase
        .from("user_plans")
        .select("id,plan_type,created_at")
        .eq("user_id", user?.id)
        .single();

      setCurrentPlan(planData as any);

      // Fetch user profile
      const { data: profileData } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (profileData) {
        setUserProfile(profileData as any);
        // Load security settings
        setTwoFactorAuth(profileData.two_factor_auth || false);
        setSessionTimeout(profileData.session_timeout?.toString() || "30");
      } else {
        // Create default profile
        setUserProfile({
          id: user?.id || "",
          email: user?.email || "",
          full_name: user?.user_metadata?.full_name || "",
          company_name: "",
          phone: "",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: "en",
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!userProfile) return;
    
    setSaving(true);
    try {
      // Handle demo user differently
      if (user?.email === DEMO_EMAIL) {
        // For demo users, just update the local state and save to localStorage
        const updatedProfile = {
          ...userProfile,
          updated_at: new Date().toISOString(),
        };
        setUserProfile(updatedProfile);
        
        // Save to localStorage for demo persistence
        localStorage.setItem('demo_user_profile', JSON.stringify(updatedProfile));
        
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
        
        setSaving(false);
        return;
      }

      // Real user - use Edge Function
      const { data: authData } = await supabase.auth.getSession();
      const jwt = authData.session?.access_token || "";

      const res = await supabase.functions.invoke("update-user-profile", {
        body: {
          full_name: userProfile.full_name,
          company_name: userProfile.company_name,
          phone: userProfile.phone,
          timezone: userProfile.timezone,
          language: userProfile.language,
        },
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.error) {
        console.error('Function error:', res.error);
        throw new Error(res.error.message || 'Unknown error occurred');
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });

      // Refresh user data
      fetchUserData();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.")) {
      return;
    }

    setDeleting(true);
    try {
      // Handle demo user differently
      if (user?.email === DEMO_EMAIL) {
        // For demo users, just clear localStorage and sign out
        localStorage.removeItem('demo_user_profile');
        localStorage.removeItem('lip_demo_mode');
        
        toast({
          title: "Demo Account Deleted",
          description: "Your demo account has been deleted. You will be signed out.",
        });

        // Sign out and redirect
        await signOut();
        window.location.href = "/";
        return;
      }

      // Real user - use Edge Function
      const { data: authData } = await supabase.auth.getSession();
      const jwt = authData.session?.access_token || "";

      const res = await supabase.functions.invoke("delete-user-account", {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (res.error) throw new Error(res.error.message);

      toast({
        title: "Account Deleted",
        description: "Your account data has been deleted. You will be signed out.",
      });

      // Sign out and redirect
      await signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };



  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case "starter": return <Zap className="w-4 h-4" />;
      case "professional": return <Crown className="w-4 h-4" />;
      case "enterprise": return <Building className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case "starter": return "bg-blue-500";
      case "professional": return "bg-purple-500";
      case "enterprise": return "bg-orange-500";
      default: return "bg-blue-500";
    }
  };

  if (!user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading settings...</p>
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
              <SettingsIcon className="w-5 h-5" />
              <h1 className="text-xl font-semibold">Settings</h1>
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account, subscription, and preferences
              </p>
            </div>

                         <Tabs defaultValue="account" className="space-y-6">
               <TabsList className="grid w-full grid-cols-3">
                 <TabsTrigger value="account" className="flex items-center gap-2">
                   <User className="w-4 h-4" />
                   Account
                 </TabsTrigger>
                 <TabsTrigger value="subscription" className="flex items-center gap-2">
                   <CreditCard className="w-4 h-4" />
                   Subscription
                 </TabsTrigger>
                 <TabsTrigger value="security" className="flex items-center gap-2">
                   <Shield className="w-4 h-4" />
                   Security
                 </TabsTrigger>
               </TabsList>

              {/* Account Settings */}
              <TabsContent value="account" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal and company information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={userProfile?.full_name || ""}
                          onChange={(e) => setUserProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={userProfile?.email || ""}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          value={userProfile?.company_name || ""}
                          onChange={(e) => setUserProfile(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                          placeholder="Enter your company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={userProfile?.phone || ""}
                          onChange={(e) => setUserProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                    <Button onClick={handleProfileUpdate} disabled={saving} className="w-full md:w-auto">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>

              </TabsContent>

              {/* Subscription Settings */}
              <TabsContent value="subscription" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Subscription</CardTitle>
                    <CardDescription>
                      Manage your subscription and billing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {currentPlan ? (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${getPlanColor(currentPlan.plan_type)}`}>
                            {getPlanIcon(currentPlan.plan_type)}
                          </div>
                          <div>
                            <h3 className="font-semibold capitalize">{currentPlan.plan_type} Plan</h3>
                            <p className="text-sm text-muted-foreground">
                              Active since {new Date(currentPlan.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {currentPlan.plan_type}
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                        <p className="text-muted-foreground mb-4">
                          You don't have an active subscription. Please select a plan to continue.
                        </p>
                        <Button asChild>
                          <a href="/plan-selection">Choose a Plan</a>
                        </Button>
                      </div>
                    )}

                    
                  </CardContent>
                </Card>
              </TabsContent>

              

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your account security preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Two-Factor Authentication</Label>
                          <p className="text-sm text-muted-foreground">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Switch
                          checked={twoFactorAuth}
                          onCheckedChange={setTwoFactorAuth}
                        />
                      </div>
                                             <div className="space-y-2">
                         <Label htmlFor="sessionTimeout">Session Timeout</Label>
                         <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                           <SelectTrigger>
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="15">15 minutes</SelectItem>
                             <SelectItem value="30">30 minutes</SelectItem>
                             <SelectItem value="60">1 hour</SelectItem>
                             <SelectItem value="120">2 hours</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                     <Button onClick={handleSecuritySettingsUpdate} disabled={saving} className="w-full md:w-auto">
                       {saving ? "Saving..." : "Save Security Settings"}
                     </Button>
                   </CardContent>
                 </Card>

                                 <Card>
                   <CardHeader>
                     <CardTitle>Account Actions</CardTitle>
                     <CardDescription>
                       Manage your account
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <Button 
                       variant="destructive" 
                       onClick={handleDeleteAccount} 
                       disabled={deleting}
                       className="w-full"
                     >
                       <Trash2 className="w-4 h-4 mr-2" />
                       {deleting ? "Deleting Account..." : "Delete Account"}
                     </Button>
                   </CardContent>
                 </Card>
              </TabsContent>

              
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Settings;
