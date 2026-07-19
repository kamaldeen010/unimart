import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Profile = {
  user_id: string;
  email: string;
  full_name: string;
  store_name: string;
  phone: string;
  role: 'vendor' | 'admin';
  wallet_balance: number;
  created_at: string;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  completeProfile: (fullName: string, storeName: string, phone: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, email, full_name, store_name, phone, role, wallet_balance, created_at')
      .eq('user_id', uid)
      .maybeSingle();
    if (error || !data) return null;
    return {
      user_id: data.user_id,
      email: data.email ?? '',
      full_name: data.full_name ?? '',
      store_name: data.store_name ?? '',
      phone: data.phone ?? '',
      role: (data.role === 'admin' ? 'admin' : 'vendor'),
      wallet_balance: typeof data.wallet_balance === 'number' ? data.wallet_balance : Number(data.wallet_balance ?? 0),
      created_at: data.created_at ?? '',
    };
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).then((p) => {
          if (mounted) {
            setProfile(p);
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          const p = await fetchProfile(newSession.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp: AuthState['signUp'] = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    const uid = data.user?.id;
    if (!uid) return { error: 'Sign-up failed. Please try again.' };
    // Create a minimal profile row; user completes details on the onboarding screen
    const { error: insErr } = await supabase.from('profiles').insert({
      user_id: uid,
      email: email.trim().toLowerCase(),
      full_name: '',
      store_name: '',
      phone: '',
      role: 'vendor',
      wallet_balance: 0,
    });
    if (insErr) return { error: insErr.message };
    const fresh = await fetchProfile(uid);
    setProfile(fresh);
    return { error: null };
  };

  const signIn: AuthState['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const resetPassword: AuthState['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) return { error: error.message };
    return { error: null };
  };

  const verifyRecoveryOtp: AuthState['verifyRecoveryOtp'] = async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'recovery',
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const updatePassword: AuthState['updatePassword'] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return { error: null };
  };

  const completeProfile: AuthState['completeProfile'] = async (fullName, storeName, phone) => {
    if (!user) return { error: 'Not signed in.' };
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, store_name: storeName, phone })
      .eq('user_id', user.id);
    if (error) return { error: error.message };
    await refreshProfile();
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signUp, signIn, resetPassword, verifyRecoveryOtp, updatePassword, completeProfile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
