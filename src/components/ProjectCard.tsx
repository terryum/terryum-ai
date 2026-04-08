'use client';

import Image from 'next/image';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import type { ProjectMeta } from '@/types/project';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  wip: { label: 'WIP', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  archived: { label: 'Archived', className: 'bg-gray-500/10 text-gray-500' },
};

const LINK_ICONS: Record<string, { label: string; icon: React.ReactNode }> = {
  github: {
    label: 'GitHub',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  demo: {
    label: 'Demo',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  paper: {
    label: 'Paper',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  book: {
    label: 'Book',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  other: {
    label: 'Link',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    ),
  },
};

interface ProjectCardProps {
  project: ProjectMeta;
  locale: string;
}

export default function ProjectCard({ project, locale }: ProjectCardProps) {
  const title = project.title[locale as 'ko' | 'en'] || project.title.en;
  const description = project.description[locale as 'ko' | 'en'] || project.description.en;
  const badge = STATUS_BADGE[project.status] ?? STATUS_BADGE.active;
  const primaryLink = project.links[0]?.url;

  function handleCardClick() {
    trackEvent('project_card_click', {
      project_slug: project.slug,
      project_title: title,
      link_url: primaryLink || '',
    });
  }

  const cardClassName = "group block rounded-xl border border-line-default overflow-hidden transition-all hover:border-accent/40 hover:shadow-md";

  const cardInner = (
    <>
      {/* Cover image */}
      <div className="relative aspect-[16/9] bg-bg-surface overflow-hidden">
        <Image
          src={project.cover_image}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized={project.cover_image.startsWith('/api/')}
        />
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors leading-snug">
            {project.project_number != null && <span className="text-xs text-text-muted font-normal mr-1">P{project.project_number}</span>}
            {title}
          </h3>
          <time className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
            {new Date(project.published_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short' })}
          </time>
        </div>
        <p className="text-sm text-text-muted mt-1.5 line-clamp-2">
          {description}
        </p>

        {/* Tech stack pills */}
        {project.tech_stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.tech_stack.map((tech) => (
              <span
                key={tech}
                className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Links */}
        {project.links.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line-default">
            {project.links.map((link) => {
              const iconDef = LINK_ICONS[link.type] ?? LINK_ICONS.other;
              return (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    trackEvent('project_link_click', {
                      project_slug: project.slug,
                      link_type: link.type,
                      link_url: link.url,
                    });
                  }}
                >
                  {iconDef.icon}
                  <span>{link.label || iconDef.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  // embed_url이 있으면 내부 상세 페이지로, 없으면 외부 링크로
  if (project.embed_url) {
    return (
      <Link href={`/${locale}/projects/${project.slug}`} onClick={handleCardClick} className={cardClassName}>
        {cardInner}
      </Link>
    );
  }

  if (primaryLink) {
    return (
      <a href={primaryLink} target="_blank" rel="noopener noreferrer" onClick={handleCardClick} className={cardClassName}>
        {cardInner}
      </a>
    );
  }

  return (
    <div className={cardClassName}>
      {cardInner}
    </div>
  );
}
