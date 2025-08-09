import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/components/ui/auth-provider';
import { LocationProvider } from '@/contexts/LocationContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
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
                <ProtectedRoute requiresLocation={true}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reviews"
              element={
                <ProtectedRoute requiresLocation={true}>
                  <Reviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute requiresLocation={true}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sentiment"
              element={
                <ProtectedRoute requiresLocation={true}>
                  <Sentiment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations"
              element={
                <ProtectedRoute>
                  <Locations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/plan-management"
              element={
                <ProtectedRoute>
                  <PlanManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrderHistory />
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

            {/* Catch-all for unknown routes */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
