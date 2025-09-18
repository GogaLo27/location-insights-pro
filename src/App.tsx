import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/ui/auth-provider';
import { LocationProvider } from '@/contexts/LocationContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ConditionalThemeProvider } from '@/components/ui/conditional-theme-provider';
import CookieConsent from '@/components/CookieConsent';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Locations from './pages/Locations';
import Reviews from './pages/Reviews';
import Analytics from './pages/Analytics';
import Sentiment from './pages/Sentiment';
import PlanSelection from './pages/PlanSelection';
import PlanManagement from './pages/PlanManagement';
import LocationSelection from './pages/LocationSelection';
import BillingSuccess from './pages/BillingSuccess';
import BillingCancel from './pages/BillingCancel';
import OrderHistory from './pages/OrderHistory';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import CookiePolicy from './pages/CookiePolicy';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <ConditionalThemeProvider>
            <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/plan-selection"
              element={
                <ProtectedRoute requiresPlan={false}>
                  <PlanSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={true}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={true}>
                  <Reviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={true}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sentiment"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={true}>
                  <Sentiment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <Locations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan-management"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <PlanManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <OrderHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/location-selection"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <LocationSelection />
                </ProtectedRoute>
              }
            />

            {/* ✅ PayPal return routes */}
            <Route
              path="/billing/success"
              element={
                <ProtectedRoute requiresPlan={false} requiresLocation={false}>
                  <BillingSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/cancel"
              element={
                <ProtectedRoute requiresPlan={false} requiresLocation={false}>
                  <BillingCancel />
                </ProtectedRoute>
              }
            />

            {/* Public routes */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            
            {/* Catch-all for unknown routes */}
            <Route path="*" element={<NotFound />} />
            </Routes>
            <CookieConsent />
          </ConditionalThemeProvider>
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
