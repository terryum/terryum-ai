import { redirect } from 'next/navigation';
import { getAuthenticatedGroup } from '@/lib/group-auth';
import { isAdmin } from '@/lib/identity';
import LoginForm from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo, error } = await searchParams;

  // Already authenticated → redirect (only when there is no pending error)
  if (!error) {
    const [group, admin] = await Promise.all([
      getAuthenticatedGroup(),
      isAdmin(),
    ]);
    if (group || admin) {
      const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/posts';
      redirect(target);
    }
  }

  return <LoginForm redirectTo={redirectTo} error={error} />;
}
