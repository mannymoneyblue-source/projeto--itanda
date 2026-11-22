import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signUp: (fullName: string, email: string, password: string, phone?: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    let attempts = 0;
    while (attempts < 3) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
        return data as Profile;
      }
      // Profile may not exist yet (trigger hasn't run). Retry after short delay.
      attempts++;
      if (attempts < 3) await new Promise((r) => setTimeout(r, 300));
    }
    // If still no profile, create a fallback from auth user metadata
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const fallback: Profile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        role: 'customer',
        phone: user.user_metadata?.phone || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfile(fallback);
      return fallback;
    }
    return null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      setSession(currentSession);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (event === 'SIGNED_IN' && newSession?.user) {
        (async () => {
          // Record login notification
          const userAgent = navigator.userAgent;
          const loginMethod = newSession.user.app_metadata?.provider === 'google' ? 'google' : 'password';
          try {
            await supabase.rpc('notify_new_login', {
              p_user_id: newSession.user.id,
              p_login_method: loginMethod,
              p_user_agent: userAgent,
            });
          } catch {
            // non-critical
          }
          await fetchProfile(newSession.user.id);
        })();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
      } else if (newSession?.user) {
        (async () => {
          await fetchProfile(newSession.user.id);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signUp = useCallback(async (fullName: string, email: string, password: string, phone?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || '',
        },
      },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    if (!data.user) return { error: 'Erro inesperado no registo.', needsConfirmation: false };
    // Check if email confirmation is required
    const needsConfirmation = !data.session;
    return { error: null, needsConfirmation };
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const user: AuthUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email || '',
        fullName: profile?.full_name || session.user.user_metadata?.full_name || '',
        role: profile?.role || 'customer',
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isAdmin: profile?.role === 'admin',
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
        resendConfirmation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function getInitials(user: User | null): string {
  const name = user?.user_metadata?.full_name || user?.email || '';
  return name.charAt(0).toUpperCase();
}
