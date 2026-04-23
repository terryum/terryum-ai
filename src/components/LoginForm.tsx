'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  redirectTo?: string;
  error?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "This account isn't authorized to sign in.",
  email_unverified: 'Your Google email is not verified.',
  state_mismatch: 'Security check failed. Please try again.',
  invalid_state: 'Invalid login state. Please try again.',
  missing_params: 'Login was not completed.',
  verify_failed: 'Could not verify your Google account. Please try again.',
  access_denied: 'Login was cancelled.',
};

export default function LoginForm({ redirectTo, error }: LoginFormProps) {
  const [group, setGroup] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const safeRedirect = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/posts';
  const googleUrl = `/api/auth/google/start?redirect=${encodeURIComponent(redirectTo || '/')}`;
  const providerError = error ? (ERROR_MESSAGES[error] ?? 'Sign-in failed.') : '';

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!group.trim() || !password.trim()) return;
    setFormError('');
    setLoading(true);
    try {
      const res = await fetch('/api/co/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: group.trim().toLowerCase(), password: password.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Invalid group or password');
        return;
      }
      router.push(safeRedirect);
    } catch {
      setFormError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-xs space-y-6">
        <h1 className="text-lg font-medium text-text-primary text-center">Login</h1>

        {providerError && (
          <p className="text-red-500 text-sm text-center">{providerError}</p>
        )}

        <a
          href={googleUrl}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-line-default rounded-md bg-bg-surface text-text-primary text-sm hover:bg-bg-primary transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </a>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="flex-1 h-px bg-line-default" />
          <span>or group access</span>
          <div className="flex-1 h-px bg-line-default" />
        </div>

        <form onSubmit={handleGroupSubmit} className="space-y-3">
          <input
            type="text"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Group"
            className="w-full px-3 py-2 border border-line-default rounded-md bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3 py-2 border border-line-default rounded-md bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {formError && <p className="text-red-500 text-sm text-center">{formError}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-3 py-2 bg-accent text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Verifying...' : 'Group login'}
          </button>
        </form>
      </div>
    </div>
  );
}
