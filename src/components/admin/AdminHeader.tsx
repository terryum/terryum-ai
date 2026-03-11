'use client';

import { useRouter } from 'next/navigation';

export default function AdminHeader() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <header className="border-b border-line-default bg-bg-primary">
      <div className="max-w-5xl mx-auto px-4 md:px-6 flex items-center justify-between h-12">
        <span className="text-sm font-medium text-text-primary">Admin</span>
        <button
          onClick={handleLogout}
          className="text-sm text-text-secondary hover:text-accent transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
