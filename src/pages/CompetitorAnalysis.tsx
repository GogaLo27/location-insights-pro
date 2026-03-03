import React from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { PageOrbs, PageTitle, fancyCardClass } from "@/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Clock } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function CompetitorAnalysis() {
  const { user, loading: authLoading } = useAuth();
  const { canUseCompetitorAnalysis } = usePlanFeatures();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!canUseCompetitorAnalysis) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
          <AppSidebar />
          <SidebarInset className="relative overflow-x-hidden">
            <PageOrbs />
            <header className="sticky top-0 z-10 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-3 sm:px-6">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center space-x-4 ml-auto">
                <LocationSelector />
              </div>
            </header>
            <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6">
              <UpgradePrompt 
                feature="Competitor Analysis"
                title="Unlock Competitor Analysis"
                description="Monitor your competitors' review performance, compare ratings, and gain market insights to stay ahead of the competition."
                variant="page"
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10">
        <AppSidebar />
        <SidebarInset className="relative overflow-x-hidden">
          <PageOrbs />
          <header className="sticky top-0 z-10 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-3 sm:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-auto">
              <LocationSelector />
            </div>
          </header>

          <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6">
            <PageTitle title="Competitor Analysis Dashboard" subtitle="Compare your performance against competitors and gain market insights" />

            <Card className={`mb-8 ${fancyCardClass}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Competitor Analysis Dashboard</span>
                </CardTitle>
                <CardDescription>
                  Advanced analytics and comparison tools for competitor monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    We're building a comprehensive competitor analysis dashboard with powerful insights and comparison tools.
                  </p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Side-by-side performance comparison</p>
                    <p>• Rating and review trend analysis</p>
                    <p>• Market share insights</p>
                    <p>• Competitive advantage identification</p>
                    <p>• Automated competitor reports</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}