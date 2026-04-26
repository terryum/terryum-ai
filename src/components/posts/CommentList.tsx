'use client';

import type { Locale } from '@/lib/i18n';

export interface PublicComment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

interface Props {
  comments: PublicComment[];
  locale: Locale;
  loading?: boolean;
}

function formatTime(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return iso;
  }
}

export default function CommentList({ comments, locale, loading }: Props) {
  if (loading) {
    return <p className="text-sm text-text-muted">{locale === 'ko' ? '불러오는 중…' : 'Loading…'}</p>;
  }
  if (comments.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        {locale === 'ko' ? '아직 댓글이 없습니다. 첫 댓글을 남겨보세요.' : 'No comments yet. Be the first to comment.'}
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="border-b border-line-default pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-text-primary">{c.author_name}</span>
            <time className="text-xs text-text-muted">{formatTime(c.created_at, locale)}</time>
          </div>
          <p className="mt-1 text-sm text-text-secondary whitespace-pre-wrap break-words">{c.content}</p>
        </li>
      ))}
    </ul>
  );
}
