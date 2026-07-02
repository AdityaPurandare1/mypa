import { useState } from 'react';
import { useAuth } from '@/lib/auth';

export function SignIn() {
  const { signIn, signInWithEmail, error } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await signInWithEmail(email);
    setBusy(false);
    if (res.sent) setSent(true);
  }

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">myPA</h1>
        <p className="mt-2 text-sm text-slate-400">Speak your mind. It sorts the rest.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => void signIn()}
          className="w-full rounded-xl bg-white px-4 py-3 font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-700" />
          or
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        {sent ? (
          <p className="rounded-xl bg-slate-800 px-4 py-3 text-center text-sm text-slate-200">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form onSubmit={onEmail} className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white transition hover:bg-brand-soft disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Email me a magic link'}
            </button>
          </form>
        )}

        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}
