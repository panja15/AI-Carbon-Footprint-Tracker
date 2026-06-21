'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signUp: async () => { },
  signIn: async () => { },
  signInWithGoogle: async () => { },
  signOut: async () => { },
  forgotPassword: async () => { }
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Fetch active session on mount
    async function getSession() {
      try {
        const { data: { session: activeSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(activeSession);
        setUser(activeSession?.user || null);
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      } finally {
        setLoading(false);
      }
    }

    getSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Route protection redirects
  useEffect(() => {
    if (loading) return;

    const publicRoutes = ['/login', '/signup', '/forgot-password'];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!session && !isPublicRoute) {
      // User is unauthenticated and trying to access a protected page
      router.push('/login');
    } else if (session && isPublicRoute) {
      // User is authenticated and trying to access a login/signup page
      router.push('/dashboard');
    }
  }, [session, loading, pathname, router]);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push('/login');
  };

  const forgotPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login?reset=true`
    });
    if (error) throw error;
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        forgotPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
