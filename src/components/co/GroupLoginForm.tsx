'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GroupLoginFormProps {
  group: string;
  redirectTo?: string;
}

export default function GroupLoginForm({ group, redirectTo }: GroupLoginFormProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validate redirectTo: must start with / to prevent open redirect
  const safeRedirect = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/posts';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/co/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Invalid password');
        return;
      }

      router.push(safeRedirect);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <h1 className="text-lg font-medium text-text-primary text-center">
          {group.toUpperCase()} Portal
        </h1>
        <p className="text-sm text-text-secondary text-center">
          Enter the password to access private content.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-3 py-2 border border-line-default rounded-md bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 bg-accent text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Verifying...' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
