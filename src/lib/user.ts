// Small display helpers for the auth user: greeting name, monogram, email.
// Mirrors the fallback chain used when syncing the profile row.

import type { User } from '@supabase/supabase-js';

/** Best display name: metadata name → email local-part → "there". */
export function displayName(user: User | null | undefined): string {
  if (!user) return 'there';
  const meta = user.user_metadata ?? {};
  const name = (meta.name as string) || (meta.full_name as string);
  if (name) return name.split(' ')[0];
  const local = user.email?.split('@')[0];
  return local || 'there';
}

/** Full name (for Settings profile card): metadata name → email local → "You". */
export function fullName(user: User | null | undefined): string {
  if (!user) return 'You';
  const meta = user.user_metadata ?? {};
  return (meta.name as string) || (meta.full_name as string) || user.email?.split('@')[0] || 'You';
}

/** Single uppercase monogram letter. */
export function monogram(user: User | null | undefined): string {
  const n = fullName(user);
  return (n[0] || '?').toUpperCase();
}

/** Email or empty string. */
export function email(user: User | null | undefined): string {
  return user?.email ?? '';
}
