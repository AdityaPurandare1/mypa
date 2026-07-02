import { createClient } from '@supabase/supabase-js';

// Client config for myPA. The anon key is safe for the browser — RLS policies
// (see supabase/migrations/*_rls.sql) enforce per-user row access. Placeholder
// fallbacks let the app build/test before the project is linked; a real value
// is required at runtime for anything to load.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co';
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'public-anon-placeholder';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    // We own the OAuth callback in AuthProvider — auto-detection at
    // createClient time races React's boot and swallows failures silently.
    detectSessionInUrl: false,
  },
});
