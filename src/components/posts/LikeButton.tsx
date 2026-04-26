'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

interface Props {
  slug: string;
  locale: Locale;
}

interface LikeState {
  count: number;
  liked: boolean;
}

export default function LikeButton({ slug, locale }: Props) {
  const [state, setState] = useState<LikeState | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${slug}/like`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as LikeState;
        if (!cancelled) setState(data);
      } catch {
        /* silent — non-critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const onClick = async () => {
    if (pending) return;
    setPending(true);

    // Optimistic update
    const prev = state;
    if (prev) {
      const nextLiked = !prev.liked;
      setState({ count: prev.count + (nextLiked ? 1 : -1), liked: nextLiked });
    }

    try {
      const res = await fetch(`/api/posts/${slug}/like`, { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { liked: boolean; count: number };
        setState({ liked: data.liked, count: data.count });
      } else if (prev) {
        setState(prev);
      }
    } catch {
      if (prev) setState(prev);
    } finally {
      setPending(false);
    }
  };

  const count = state?.count ?? 0;
  const liked = state?.liked ?? false;
  const label = locale === 'ko' ? '좋아요' : 'Like';

  return (
    <div className="flex items-center gap-3 mb-8">
      <button
        type="button"
        onClick={onClick}
        disabled={pending || state === null}
        aria-pressed={liked}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
          liked
            ? 'border-accent text-accent bg-accent/10'
            : 'border-line-default text-text-secondary hover:text-accent hover:border-accent'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"
          />
        </svg>
        <span>{label}</span>
        <span className="tabular-nums text-text-muted">{count}</span>
      </button>
    </div>
  );
}
