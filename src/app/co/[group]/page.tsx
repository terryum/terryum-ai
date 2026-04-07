import { canAccessGroup, isGroupConfigured } from '@/lib/group-auth';
import { notFound, redirect } from 'next/navigation';
import GroupLoginForm from '@/components/co/GroupLoginForm';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ redirect?: string }>;
}

export default async function GroupLoginPage({ params, searchParams }: Props) {
  const { group } = await params;
  const { redirect: redirectTo } = await searchParams;

  if (!isGroupConfigured(group)) {
    notFound();
  }

  const hasAccess = await canAccessGroup(group);

  if (hasAccess) {
    // Already authenticated — redirect to target or main posts page
    const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/posts';
    redirect(target);
  }

  return <GroupLoginForm group={group} redirectTo={redirectTo} />;
}
