import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/components/ui/auth-provider';
import { usePlan } from '@/hooks/usePlan';

interface ProtectedRouteProps {
  children: ReactNode;
  requiresPlan?: boolean;
}

export const ProtectedRoute = ({ children, requiresPlan = true }: ProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { plan, loading: planLoading } = usePlan();

  if (authLoading || (requiresPlan && planLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiresPlan && !plan) {
    return <Navigate to="/plan-selection" replace />;
  }

  return <>{children}</>;
};