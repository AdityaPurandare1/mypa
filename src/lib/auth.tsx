import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { deviceTimeZone } from './time';

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
  /** Google OAuth. */
  signIn: () => Promise<void>;
  /** Magic-link email sign-in. Returns `{ sent: true }` on success so the UI
   *  can show a "check your email" state. */
  signInWithEmail: (email: string) => Promise<{ sent: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

/** Best-effort profile row upsert so the browser timezone stays current even
 *  if the DB trigger already provisioned the row. Never throws. */
async function syncProfile(session: Session): Promise<void> {
  try {
    const meta = session.user.user_metadata ?? {};
    await supabase.from('profiles').upsert(
      {
        id: session.user.id,
        display_name:
          (meta.name as string) ??
          (meta.full_name as string) ??
          session.user.email?.split('@')[0] ??
          null,
        avatar_url: (meta.avatar_url as string) ?? null,
        timezone: deviceTimeZone(),
      },
      { onConflict: 'id' },
    );
  } catch {
    // Profile is non-critical for the app to function; ignore failures.
  }
}

/** Wraps the app so any screen can read the current Supabase session.
 *
 *  We disable Supabase's `detectSessionInUrl` and do the OAuth code exchange
 *  ourselves: the auto-detect runs at createClient time (module load), which
 *  races React's boot and silently swallows failures. Owning the flow here
 *  makes errors loud (rendered on the sign-in screen). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const errCode = url.searchParams.get('error') ?? url.searchParams.get('error_code');
      const errDesc = url.searchParams.get('error_description');

      if (errCode) {
        setError(`OAuth error: ${errCode}${errDesc ? ' — ' + decodeURIComponent(errDesc) : ''}`);
      } else if (code) {
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) setError('Sign-in failed: ' + error.message);
        } catch (e) {
          setError('Sign-in failed: ' + (e instanceof Error ? e.message : String(e)));
        }
      }

      // Strip OAuth params so a refresh doesn't replay them.
      if (code || errCode) {
        url.searchParams.delete('code');
        url.searchParams.delete('error');
        url.searchParams.delete('error_code');
        url.searchParams.delete('error_description');
        url.searchParams.delete('state');
        url.hash = '';
        window.history.replaceState(null, '', url.toString());
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) void syncProfile(data.session);
    }

    void boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      if (cancelled) return;
      setSession(s);
      setLoading(false);
      if (s) void syncProfile(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    setError(null);
    // Always redirect to the app base — never the current pathname.
    // BASE_URL is `/` in dev and `/mypa/` in prod.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'email profile',
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) setError('Sign-in failed: ' + error.message);
  }

  async function signInWithEmail(email: string): Promise<{ sent: boolean; error?: string }> {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/.+@.+\..+/.test(trimmed)) {
      const msg = 'Enter a valid email';
      setError(msg);
      return { sent: false, error: msg };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
        shouldCreateUser: true,
      },
    });
    if (error) {
      setError('Email sign-in failed: ' + error.message);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  }

  async function signOut() {
    setError(null);
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ session, loading, error, signIn, signInWithEmail, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}

/** Convenience: the current user_id, or null if signed out. */
export function useUserId(): string | null {
  return useAuth().session?.user.id ?? null;
}
