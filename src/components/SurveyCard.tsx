'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SurveyMeta } from '@/types/survey';

interface SurveyCardProps {
  survey: SurveyMeta;
  locale: string;
}

export default function SurveyCard({ survey, locale }: SurveyCardProps) {
  const title = survey.title[locale as 'ko' | 'en'] || survey.title.en;
  const description = survey.description[locale as 'ko' | 'en'] || survey.description.en;
  const href = survey.embed_url
    ? `/${locale}/surveys/${survey.slug}`
    : survey.links[0]?.url || '#';
  const isExternal = !survey.embed_url;
  const date = new Date(survey.published_at).toLocaleDateString(
    locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'short' }
  );

  return (
    <Link
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group block border border-line-default rounded-lg overflow-hidden hover:border-accent/40 transition-colors"
    >
      {/* ── Desktop: 3-column (cover | info+tags | toc) ── */}
      <div className="hidden sm:flex">
        {/* Col 1: Cover */}
        {survey.cover_image && (
          <div className="w-40 flex-shrink-0 bg-bg-surface relative">
            <Image
              src={survey.cover_image}
              alt={title}
              fill
              className="object-cover"
              sizes="160px"
              unoptimized={survey.cover_image.startsWith('/api/')}
            />
          </div>
        )}

        {/* Col 2+3 wrapper */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title bar — spans full width */}
          <div className="px-5 pt-4 pb-2">
            <span className="text-xs text-text-muted">S{survey.survey_number}</span>
            <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug mt-0.5">
              {title}
            </h3>
          </div>

          {/* Bottom: description (left) | toc (right) */}
          <div className="flex-1 flex px-5 pb-4 gap-6">
            {/* Left: description + meta */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
                {survey.tech_stack.map(tag => (
                  <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-muted">
                    {tag}
                  </span>
                ))}
                <span className="text-[11px] text-text-muted ml-auto">{date}</span>
              </div>
            </div>

            {/* Right: TOC */}
            {survey.toc.length > 0 && (
              <div className="w-52 flex-shrink-0 text-xs text-text-muted border-l border-line-default pl-4">
                <span className="font-medium text-text-secondary">
                  {locale === 'ko' ? '목차' : 'Contents'} ({survey.toc.length})
                </span>
                <ol className="mt-1.5 space-y-0.5 list-decimal list-inside">
                  {survey.toc.map((ch, i) => (
                    <li key={i} className="truncate">{ch}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile: stacked ── */}
      <div className="sm:hidden">
        {/* Cover — 16:9 */}
        {survey.cover_image && (
          <div className="relative aspect-[16/9] bg-bg-surface">
            <Image
              src={survey.cover_image}
              alt={title}
              fill
              className="object-cover"
              sizes="100vw"
              unoptimized={survey.cover_image.startsWith('/api/')}
            />
          </div>
        )}

        <div className="p-4 flex flex-col gap-3">
          {/* Title */}
          <div>
            <span className="text-xs text-text-muted">S{survey.survey_number}</span>
            <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug mt-0.5">
              {title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>

          {/* TOC — collapsible preview */}
          {survey.toc.length > 0 && (
            <div className="text-xs text-text-muted">
              <span className="font-medium text-text-secondary">
                {locale === 'ko' ? '목차' : 'Contents'} ({survey.toc.length})
              </span>
              <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                {survey.toc.slice(0, 4).map((ch, i) => (
                  <li key={i} className="truncate">{ch}</li>
                ))}
                {survey.toc.length > 4 && (
                  <li className="text-text-muted">...+{survey.toc.length - 4} more</li>
                )}
              </ol>
            </div>
          )}

          {/* Tags + date */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {survey.tech_stack.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-muted">
                {tag}
              </span>
            ))}
            <span className="text-[11px] text-text-muted ml-auto">{date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
