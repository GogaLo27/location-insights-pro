import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/ui/auth-provider';
import { usePlan } from '@/hooks/usePlan';
import { useLocation as useLocationContext } from '@/contexts/LocationContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiresPlan?: boolean;
  /**
   * When true, the route will only render if the user has a selected location.
   * If a location is required but missing, the user will be redirected to
   * `/location-selection`. Defaults to false.
   */
  requiresLocation?: boolean;
}

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-lg text-muted-foreground">Loading…</p>
    </div>
  </div>
);

export const ProtectedRoute = ({
  children,
  requiresPlan = true,
  requiresLocation = false,
}: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { plan, loading: planLoading } = usePlan();
  const { selectedLocation, loading: locationLoading } = useLocationContext();

  // Show loading until we know auth state, plan, and (if required) location
  if (
    authLoading ||
    (requiresPlan && planLoading) ||
    (requiresLocation && locationLoading)
  ) {
    return <LoadingScreen />;
  }

  // Not authenticated → back to landing page
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Requires a plan → go to plan selection if none exists
  if (requiresPlan && !plan) {
    return <Navigate to="/plan-selection" replace />;
  }

  // Requires a location → go to location selection if none selected
  if (requiresLocation && plan && !selectedLocation) {
    return <Navigate to="/location-selection" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
