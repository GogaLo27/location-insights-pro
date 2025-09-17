import { ThemeProvider } from 'next-themes';
import { useLocation } from 'react-router-dom';

interface ConditionalThemeProviderProps {
  children: React.ReactNode;
}

export const ConditionalThemeProvider: React.FC<ConditionalThemeProviderProps> = ({ children }) => {
  const location = useLocation();
  
  // Define routes that should have dark mode support (dashboard and related pages)
  const dashboardRoutes = [
    '/dashboard',
    '/reviews',
    '/analytics',
    '/sentiment',
    '/locations',
    '/plan-management',
    '/orders',
    '/settings',
    '/location-selection',
    '/plan-selection',
    '/billing/success',
    '/billing/cancel'
  ];
  
  // Check if current route is a dashboard route
  const isDashboardRoute = dashboardRoutes.some(route => 
    location.pathname.startsWith(route)
  );
  
  // If it's a dashboard route, provide theme support
  if (isDashboardRoute) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    );
  }
  
  // For public pages (landing, privacy, terms, etc.), always use light mode
  return (
    <div className="light">
      {children}
    </div>
  );
};
