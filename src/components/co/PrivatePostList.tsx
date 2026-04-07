'use client';

import Link from 'next/link';

interface PrivatePost {
  slug: string;
  content_type: string;
  title_ko: string;
  title_en: string;
  cover_image_url: string | null;
  status: string;
  updated_at: string;
}

interface PrivatePostListProps {
  group: string;
  posts: PrivatePost[];
}

export default function PrivatePostList({ group, posts }: PrivatePostListProps) {
  if (posts.length === 0) {
    return (
      <p className="text-text-secondary text-sm text-center py-8">
        No content available yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Link
          key={post.slug}
          href={`/co/${group}/${post.content_type === 'projects' ? 'projects' : 'posts'}/${post.slug}`}
          className="block p-4 border border-line-default rounded-lg hover:border-accent transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-text-secondary uppercase tracking-wide">
              {post.content_type}
            </span>
            <span className="text-xs text-text-secondary">
              {new Date(post.updated_at).toLocaleDateString()}
            </span>
          </div>
          <h3 className="text-text-primary font-medium">{post.title_ko}</h3>
          <p className="text-sm text-text-secondary mt-0.5">{post.title_en}</p>
        </Link>
      ))}
    </div>
  );
}
