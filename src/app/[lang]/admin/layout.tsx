import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/identity';

export const dynamic = 'force-dynamic';

export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) {
    redirect('/login?redirect=/admin');
  }
  return <>{children}</>;
}
