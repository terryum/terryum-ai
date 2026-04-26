'use client';

import { useEffect, useState } from 'react';
import CommentList, { type PublicComment } from './CommentList';
import CommentForm from './CommentForm';
import type { Locale } from '@/lib/i18n';

interface Props {
  slug: string;
  locale: Locale;
}

export default function CommentSection({ slug, locale }: Props) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${slug}/comments`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { comments: PublicComment[] };
        if (!cancelled) setComments(data.comments ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const onCreated = (c: PublicComment) => setComments((prev) => [c, ...prev]);

  const heading = locale === 'ko' ? '댓글' : 'Comments';

  return (
    <div>
      <h2 className="text-base font-medium text-text-primary mb-4">
        {heading}
        {!loading && comments.length > 0 && (
          <span className="ml-2 text-text-muted text-sm tabular-nums">{comments.length}</span>
        )}
      </h2>
      <CommentList comments={comments} locale={locale} loading={loading} />
      <CommentForm slug={slug} locale={locale} onCreated={onCreated} />
    </div>
  );
}
