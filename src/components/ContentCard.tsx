import Link from 'next/link';
import Image from 'next/image';
import TagChip from './TagChip';
import SourceBadge from './SourceBadge';
import type { PostMeta } from '@/types/post';

interface ContentCardProps {
  post: PostMeta;
  locale: string;
}

export default function ContentCard({ post, locale }: ContentCardProps) {
  const section = post.content_type === 'writing' ? 'write' : 'read';
  const href = `/${locale}/${section}/${post.slug}`;
  const dateStr = new Date(post.published_at).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  return (
    <Link href={href} className="block group border-b border-line-default py-6 first:pt-0 last:border-b-0">
      <article className="flex gap-4">
        {/* Thumbnail */}
        {post.cover_image && (
          <div className="hidden sm:block flex-shrink-0 w-24 h-24 relative rounded overflow-hidden bg-bg-surface">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              className="object-cover"
              sizes="96px"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-text-primary group-hover:text-accent transition-colors leading-snug">
            {post.title}
          </h3>
          <p className="text-sm text-text-muted mt-1 line-clamp-2">
            {post.summary}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <time className="text-xs text-text-muted">{dateStr}</time>
            {post.content_type === 'reading' && post.source_type && (
              <SourceBadge sourceType={post.source_type} />
            )}
            {post.tags.slice(0, 3).map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </div>
        </div>
      </article>
    </Link>
  );
}
