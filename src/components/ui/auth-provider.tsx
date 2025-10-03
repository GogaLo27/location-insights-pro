import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_EMAIL } from '@/utils/mockData';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If demo mode persisted, initialize demo user immediately
    const demoPersisted = localStorage.getItem('lip_demo_mode') === 'true';
    
    if (demoPersisted) {
      const demoUser = {
        id: 'demo-user-id',
        email: DEMO_EMAIL,
      } as unknown as User;
      setUser(demoUser);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    // Always send users back to dashboard; routing will handle plan selection if needed
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'profile email https://www.googleapis.com/auth/business.manage',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const signOut = async () => {
    const demoPersisted = localStorage.getItem('lip_demo_mode') === 'true';
    if (demoPersisted) {
      localStorage.removeItem('lip_demo_mode');
      setUser(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  const signInAsDemo = async () => {
    const demoUser = {
      id: 'demo-user-id',
      email: DEMO_EMAIL,
    } as unknown as User;
    localStorage.setItem('lip_demo_mode', 'true');
    setUser(demoUser);
    setLoading(false);
    // Navigate to dashboard to match OAuth redirect behavior
    window.location.href = '/dashboard';
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
    signInAsDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};