import type { Metadata } from 'next';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminTabBar from '@/components/admin/AdminTabBar';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return <AdminLoginForm />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <AdminHeader />
      <AdminTabBar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
