import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/ui/auth-provider";
import { LocationProvider } from "@/contexts/LocationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Locations from "./pages/Locations";
import Reviews from "./pages/Reviews";
import Analytics from "./pages/Analytics";
import Sentiment from "./pages/Sentiment";
import PlanSelection from "./pages/PlanSelection";
import PlanManagement from "./pages/PlanManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <LocationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/plan-selection" element={
                <ProtectedRoute requiresPlan={false}>
                  <PlanSelection />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/locations" element={
                <ProtectedRoute>
                  <Locations />
                </ProtectedRoute>
              } />
              <Route path="/reviews" element={
                <ProtectedRoute>
                  <Reviews />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              } />
              <Route path="/sentiment" element={
                <ProtectedRoute>
                  <Sentiment />
                </ProtectedRoute>
              } />
              <Route path="/plan-management" element={
                <ProtectedRoute>
                  <PlanManagement />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LocationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
