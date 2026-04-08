'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SurveyMeta } from '@/types/survey';

interface SurveyCardProps {
  survey: SurveyMeta;
  locale: string;
}

export default function SurveyCard({ survey, locale }: SurveyCardProps) {
  const lang = locale as 'ko' | 'en';
  const title = survey.title[lang] || survey.title.en;
  const description = survey.description[lang] || survey.description.en;
  const href = survey.embed_url
    ? `/${locale}/surveys/${survey.slug}`
    : survey.links[0]?.url || '#';
  const isExternal = !survey.embed_url;
  const lastUpdated = new Date(survey.published_at).toISOString().slice(0, 10);

  return (
    <Link
      href={href}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group block border border-line-default rounded-lg overflow-hidden hover:border-accent/40 transition-colors"
    >
      {/* ── Desktop: 3-column (cover | description | toc) ── */}
      <div className="hidden sm:flex">
        {/* Col 1: Cover */}
        {survey.cover_image && (
          <div className="w-36 flex-shrink-0 bg-bg-surface relative">
            <Image
              src={survey.cover_image}
              alt={title}
              fill
              className="object-cover"
              sizes="144px"
              unoptimized={survey.cover_image.startsWith('/api/')}
            />
          </div>
        )}

        {/* Col 2: Description */}
        <div className="flex-1 min-w-0 p-4 flex flex-col gap-1.5">
          <div>
            <span className="text-xs text-text-muted">S{survey.survey_number}</span>
            <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug mt-0.5">
              {title}
            </h3>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{description}</p>
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            {survey.tech_stack.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-surface text-text-muted">
                {tag}
              </span>
            ))}
          </div>
          <span className="text-[10px] text-text-muted">last updated: {lastUpdated}</span>
        </div>

        {/* Col 3: TOC — full height */}
        {survey.toc.length > 0 && (
          <div className="w-56 flex-shrink-0 border-l border-line-default p-4 text-xs text-text-muted">
            <span className="font-medium text-text-secondary text-[11px]">
              {locale === 'ko' ? '목차' : 'Contents'} ({survey.toc.length})
            </span>
            <ol className="mt-1.5 space-y-px list-decimal list-inside">
              {survey.toc.map((ch, i) => (
                <li key={i} className="truncate text-[11px] leading-snug">{ch[lang] || ch.en}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* ── Mobile: stacked ── */}
      <div className="sm:hidden">
        {survey.cover_image && (
          <div className="relative aspect-[21/9] bg-bg-surface">
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

        <div className="p-4 flex flex-col gap-2">
          <div>
            <span className="text-xs text-text-muted">S{survey.survey_number}</span>
            <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug mt-0.5">
              {title}
            </h3>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
          <span className="text-[10px] text-text-muted">last updated: {lastUpdated}</span>

          {survey.toc.length > 0 && (
            <div className="text-xs text-text-muted border-t border-line-default pt-2 mt-1">
              <span className="font-medium text-text-secondary">
                {locale === 'ko' ? '목차' : 'Contents'} ({survey.toc.length})
              </span>
              <ol className="mt-1 space-y-0.5 list-decimal list-inside">
                {survey.toc.slice(0, 5).map((ch, i) => (
                  <li key={i} className="truncate">{ch[lang] || ch.en}</li>
                ))}
                {survey.toc.length > 5 && (
                  <li className="text-text-muted">...+{survey.toc.length - 5} more</li>
                )}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {survey.tech_stack.map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-surface text-text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
