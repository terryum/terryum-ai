import { createClient } from '@supabase/supabase-js';
import { canAccessGroup, isGroupConfigured } from '@/lib/group-auth';
import { notFound, redirect } from 'next/navigation';
import { renderMDX } from '@/lib/mdx';
import Link from 'next/link';

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
  params: Promise<{ group: string; slug: string }>;
}

export default async function PrivateProjectPage({ params }: Props) {
  const { group, slug } = await params;

  if (!isGroupConfigured(group)) {
    notFound();
  }

  const hasAccess = await canAccessGroup(group);
  if (!hasAccess) {
    redirect(`/co/${group}`);
  }

  const { url, key } = getSupabaseRuntime();
  if (!url || !key) {
    return <p className="p-8 text-text-secondary">Database not configured.</p>;
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('private_content')
    .select('*')
    .eq('slug', slug)
    .eq('group_slug', group)
    .eq('content_type', 'projects')
    .single();

  if (error || !data) {
    notFound();
  }

  const mdxSource = data.content_ko || data.content_en || '';
  const { content } = await renderMDX(mdxSource, slug);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8">
        <Link
          href={`/co/${group}`}
          className="text-sm text-text-secondary hover:text-accent transition-colors"
        >
          &larr; Back to {group.toUpperCase()} Portal
        </Link>
      </nav>

      <header className="mb-8">
        <span className="text-xs text-text-secondary uppercase tracking-wide">
          project
        </span>
        <h1 className="text-2xl font-bold text-text-primary mt-1">
          {data.title_ko}
        </h1>
        <p className="text-lg text-text-secondary mt-1">{data.title_en}</p>
      </header>

      {data.cover_image_url && (
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.cover_image_url}
            alt={data.title_en}
            className="w-full rounded-lg"
          />
        </div>
      )}

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        {content}
      </article>
    </div>
  );
}
