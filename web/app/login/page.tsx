'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '@/lib/client';

/**
 * Sign in against the live backend: POST /auth/login sets the httpOnly
 * refresh cookie; the access token stays in memory. Clients land on the
 * dashboard, the operator on /operator.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      router.push(user.role === 'operator' ? '/operator' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-[min(400px,100%)]">
        <div className="flex items-center gap-2.5 justify-center mb-[26px]">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-accent text-accent-ink flex items-center justify-center font-serif italic text-lg">
            S
          </span>
          <span className="text-[17px] font-extrabold tracking-[-.02em]">SupportAI</span>
        </div>
        <form
          onSubmit={submit}
          className="bg-surface border border-line rounded-[18px] p-8 shadow-[0_20px_50px_-30px_rgba(24,33,28,.3)]"
        >
          <div className="text-xl font-bold tracking-[-.02em] mb-1.5">Client sign in</div>
          <div className="text-[13.5px] text-ink2 leading-relaxed mb-[22px]">
            Your account was set up for you — there&rsquo;s no signup here.
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink2">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourfirm.co.uk"
                autoComplete="email"
                className="px-[13px] py-[11px] border border-line rounded-[10px] bg-page text-ink text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-ink2">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="px-[13px] py-[11px] border border-line rounded-[10px] bg-page text-ink text-sm outline-none focus:border-accent"
              />
            </label>
            {error ? (
              <div className="text-[12.5px] font-semibold" style={{ color: 'var(--r, #b3261e)' }}>
                {error}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="mt-1.5 py-[13px] border-none rounded-[11px] bg-accent text-accent-ink text-[14.5px] font-bold cursor-pointer hover:brightness-110 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <a href="#forgot" className="text-[13px] text-center text-ink2 no-underline mt-0.5">
              Forgotten your password?
            </a>
          </div>
        </form>
        <div className="text-center mt-[18px]">
          <Link href="/" className="text-[12.5px] text-ink3 no-underline">
            ← supportai.uk
          </Link>
        </div>
      </div>
    </div>
  );
}
