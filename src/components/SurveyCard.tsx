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

  return (
    <article className="border border-line-default rounded-lg overflow-hidden hover:border-accent/40 transition-colors">
      <div className="flex flex-col sm:flex-row gap-0">
        {/* Cover image — tall book-style */}
        {survey.cover_image && (
          <Link
            href={href}
            {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="sm:w-48 flex-shrink-0"
          >
            <div className="relative aspect-[3/4] sm:h-full bg-bg-surface">
              <Image
                src={survey.cover_image}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 192px"
                unoptimized={survey.cover_image.startsWith('/api/')}
              />
            </div>
          </Link>
        )}

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          {/* Number + Title */}
          <div>
            <Link
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="group"
            >
              <span className="text-xs text-text-muted">S{survey.survey_number}</span>
              <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug mt-0.5">
                {title}
              </h3>
            </Link>
          </div>

          {/* Description */}
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>

          {/* TOC */}
          {survey.toc.length > 0 && (
            <div className="text-xs text-text-muted">
              <span className="font-medium text-text-secondary">
                {locale === 'ko' ? '목차' : 'Contents'} ({survey.toc.length} {locale === 'ko' ? '챕터' : 'chapters'})
              </span>
              <ol className="mt-1.5 space-y-0.5 list-decimal list-inside">
                {survey.toc.slice(0, 5).map((ch, i) => (
                  <li key={i} className="truncate">{ch}</li>
                ))}
                {survey.toc.length > 5 && (
                  <li className="text-text-muted">...+{survey.toc.length - 5} more</li>
                )}
              </ol>
            </div>
          )}

          {/* Tags + Links */}
          <div className="mt-auto pt-2 flex flex-wrap items-center gap-2">
            {survey.tech_stack.map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-muted">
                {tag}
              </span>
            ))}
            <div className="flex-1" />
            {survey.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                {link.label || link.type}
              </a>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
