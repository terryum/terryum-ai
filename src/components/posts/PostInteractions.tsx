'use client';

import LikeButton from './LikeButton';
import CommentSection from './CommentSection';
import type { Locale } from '@/lib/i18n';

interface Props {
  slug: string;
  locale: Locale;
}

export default function PostInteractions({ slug, locale }: Props) {
  return (
    <section className="mt-10 pt-8 border-t border-line-default" aria-label={locale === 'ko' ? '독자 반응' : 'Reader interactions'}>
      <LikeButton slug={slug} locale={locale} />
      <CommentSection slug={slug} locale={locale} />
    </section>
  );
}
