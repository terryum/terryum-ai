import { createClient } from '@supabase/supabase-js';
import { canAccessGroup, isGroupConfigured } from '@/lib/group-auth';
import { notFound } from 'next/navigation';
import GroupLoginForm from '@/components/co/GroupLoginForm';
import PrivatePostList from '@/components/co/PrivatePostList';

export const dynamic = 'force-dynamic';

function getSupabaseRuntime() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  return { url, key };
}

interface Props {
  params: Promise<{ group: string }>;
}

export default async function GroupPortalPage({ params }: Props) {
  const { group } = await params;

  if (!isGroupConfigured(group)) {
    notFound();
  }

  const hasAccess = await canAccessGroup(group);

  if (!hasAccess) {
    return <GroupLoginForm group={group} />;
  }

  const { url, key } = getSupabaseRuntime();
  if (!url || !key) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-xl font-medium text-text-primary mb-4">
          {group.toUpperCase()} Portal
        </h1>
        <p className="text-text-secondary text-sm">Database not configured.</p>
      </div>
    );
  }

  const supabase = createClient(url, key);
  const { data: posts } = await supabase
    .from('private_content')
    .select('slug, content_type, title_ko, title_en, cover_image_url, status, updated_at')
    .eq('group_slug', group)
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-medium text-text-primary">
          {group.toUpperCase()} Portal
        </h1>
        <form action="/api/co/logout" method="POST">
          <button
            type="submit"
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Logout
          </button>
        </form>
      </div>
      <PrivatePostList group={group} posts={posts ?? []} />
    </div>
  );
}
