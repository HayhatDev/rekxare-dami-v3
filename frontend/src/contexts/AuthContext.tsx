import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, api } from '../services/supabase';
import { isRecoveryUrl } from '../utils/emailAuth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  isGuest: boolean;
  /** True while the student arrived from a password-recovery email link. */
  inPasswordRecovery: boolean;
  dismissPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInAsGuest: () => {},
  signOut: async () => {},
  isGuest: false,
  inPasswordRecovery: false,
  dismissPasswordRecovery: () => {},
});

export const useAuth = () => useContext(AuthContext);

const GUEST_KEY = 'rekxare_guest_mode';

function hasStoredSession(): boolean {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => hasStoredSession());
  const [isGuest, setIsGuest] = useState(() => {
    try { return localStorage.getItem(GUEST_KEY) === 'true'; }
    catch { return false; }
  });
  // A recovery link carries `type=recovery` in the fragment. The implicit
  // session exchange then also fires PASSWORD_RECOVERY, so both are watched:
  // the URL covers a cold load, the event covers a link opened in a tab that is
  // already running.
  const [inPasswordRecovery, setInPasswordRecovery] = useState(() =>
    typeof window !== 'undefined' && isRecoveryUrl(window.location.href),
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setIsGuest(false);
        try { localStorage.removeItem(GUEST_KEY); } catch {}
        api.migrateGuestData().catch(() => {});
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setInPasswordRecovery(true);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setIsGuest(false);
        try { localStorage.removeItem(GUEST_KEY); } catch {}
        api.migrateGuestData().catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Leaving the reset screen without changing the password drops the recovery
   * grant, so a later visit cannot still write a password from a stale link.
   */
  const dismissPasswordRecovery = () => {
    setInPasswordRecovery(false);
    try { window.history.replaceState(null, '', window.location.origin + window.location.pathname); } catch {}
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    } catch (e) {
      if (import.meta.env.DEV) console.error('Google sign-in failed', e);
    }
  };

  const signInAsGuest = () => {
    setIsGuest(true);
    try { localStorage.setItem(GUEST_KEY, 'true'); } catch {}
    setLoading(false);
  };

  const signOut = async () => {
    if (supabase && user) {
      await supabase.auth.signOut();
    }
    setIsGuest(false);
    try { localStorage.removeItem(GUEST_KEY); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithGoogle, signInAsGuest, signOut, isGuest, inPasswordRecovery, dismissPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}
