import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

interface RelatedPost {
  slug: string;
  title: string;
  oneLiner: string;
  relationType: string;
  postNumber?: number | null;
}

interface RelatedPapersProps {
  locale: Locale;
  relatedPosts: RelatedPost[];
  label?: string;
}

const RELATION_LABELS: Record<string, { ko: string; en: string; strong: boolean }> = {
  builds_on:              { ko: '기반 논문',      en: 'Builds on',        strong: true },
  extends:                { ko: '방법론 확장',    en: 'Extends',          strong: true },
  uses_method:            { ko: '방법 사용',      en: 'Uses method',      strong: true },
  fills_gap_of:           { ko: '한계 보완',      en: 'Fills gap of',     strong: true },
  identifies_limitation_of: { ko: '한계 지적',   en: 'Critiques',        strong: false },
  contradicts:            { ko: '반박',           en: 'Contradicts',      strong: false },
  supports:               { ko: '지지',           en: 'Supports',         strong: false },
  compares_with:          { ko: '비교 대상',      en: 'Compares with',    strong: false },
  addresses_task:         { ko: '같은 문제 접근', en: 'Same task',        strong: false },
  uses_dataset:           { ko: '데이터셋 공유',  en: 'Uses dataset',     strong: false },
  inspired_by:            { ko: '아이디어 영감',  en: 'Inspired by',      strong: false },
  related:                { ko: '관련 논문',      en: 'Related',          strong: false },
};

function RelationBadge({ type, locale }: { type: string; locale: Locale }) {
  const info = RELATION_LABELS[type] ?? { ko: type, en: type, strong: false };
  const label = locale === 'ko' ? info.ko : info.en;
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full border font-mono ${
        info.strong
          ? 'bg-accent/10 border-accent/30 text-accent'
          : 'bg-surface-muted border-line-default text-text-muted'
      }`}
    >
      {label}
    </span>
  );
}

export default function RelatedPapers({ locale, relatedPosts, label }: RelatedPapersProps) {
  if (relatedPosts.length === 0) return null;

  const heading = label ?? (locale === 'ko' ? '관련 논문' : 'Related Papers');

  return (
    <section className="mt-10 pt-8 border-t border-line-default">
      <h2 className="text-base font-semibold text-text-primary mb-4">{heading}</h2>
      <div className="flex flex-col gap-3">
        {relatedPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/${locale}/posts/${post.slug}`}
            className="group block rounded-lg border border-line-default hover:border-accent/40 p-3 transition-colors"
          >
            <div className="flex items-start gap-2 flex-wrap">
              {post.postNumber != null && (
                <span className="font-mono text-xs text-text-muted shrink-0 mt-0.5">
                  #{post.postNumber}
                </span>
              )}
              <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors leading-snug">
                {post.title}
              </span>
              <RelationBadge type={post.relationType} locale={locale} />
            </div>
            {post.oneLiner && (
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed line-clamp-2">
                {post.oneLiner}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
