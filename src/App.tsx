import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/ui/auth-provider';
import { LocationProvider } from '@/contexts/LocationContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ConditionalThemeProvider } from '@/components/ui/conditional-theme-provider';
import CookieConsent from '@/components/CookieConsent';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Locations from './pages/Locations';
import Reviews from './pages/Reviews';
import ReviewTemplates from './pages/ReviewTemplates';
import BrandManagement from './pages/BrandManagement';
import Analytics from './pages/Analytics';
import Sentiment from './pages/Sentiment';
import Competitors from './pages/Competitors';
import CompetitorAnalysis from './pages/CompetitorAnalysis';
import PlanSelection from './pages/PlanSelection';
import PlanManagement from './pages/PlanManagement';
import Upgrade from './pages/Upgrade';
import LocationSelection from './pages/LocationSelection';
import BillingSuccess from './pages/BillingSuccess';
import BillingCancel from './pages/BillingCancel';
import OrderHistory from './pages/OrderHistory';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import CookiePolicy from './pages/CookiePolicy';
import RefundPolicy from './pages/RefundPolicy';
import Contact from './pages/Contact';
import About from './pages/About';
import Settings from './pages/Settings';
import Feedback from './pages/Feedback';
import NotFound from './pages/NotFound';
import DashboardPrivacy from './pages/DashboardPrivacy';
import DashboardTerms from './pages/DashboardTerms';
import DashboardRefund from './pages/DashboardRefund';
import DashboardCookie from './pages/DashboardCookie';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <GoogleAnalytics />
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
              path="/billing-success"
              element={
                <ProtectedRoute requiresPlan={false}>
                  <BillingSuccess />
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
              path="/templates"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <ReviewTemplates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/brands"
              element={
                <ProtectedRoute requiresPlan="enterprise" requiresLocation={false}>
                  <BrandManagement />
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
              path="/competitors"
              element={
                <ProtectedRoute requiresPlan="professional" requiresLocation={false}>
                  <Competitors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitors/analysis"
              element={
                <ProtectedRoute requiresPlan="professional" requiresLocation={true}>
                  <CompetitorAnalysis />
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
              path="/upgrade"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <Upgrade />
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
              path="/feedback"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <Feedback />
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
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />

            {/* Dashboard Legal Pages */}
            <Route
              path="/dashboard/privacy"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <DashboardPrivacy />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/terms"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <DashboardTerms />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/refund"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <DashboardRefund />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/cookie"
              element={
                <ProtectedRoute requiresPlan={true} requiresLocation={false}>
                  <DashboardCookie />
                </ProtectedRoute>
              }
            />
            
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
