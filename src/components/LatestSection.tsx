import Link from 'next/link';
import ContentCard from './ContentCard';
import type { PostMeta } from '@/types/post';

interface LatestSectionProps {
  title: string;
  viewAllHref: string;
  viewAllText: string;
  posts: PostMeta[];
  locale: string;
}

export default function LatestSection({
  title,
  viewAllHref,
  viewAllText,
  posts,
  locale,
}: LatestSectionProps) {
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          {viewAllText} &rarr;
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-text-muted text-sm py-4">No posts yet.</p>
      ) : (
        <div>
          {posts.map((post) => (
            <ContentCard key={post.post_id} post={post} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
