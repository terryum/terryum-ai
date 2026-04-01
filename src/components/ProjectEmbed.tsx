'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import type { ProjectLink } from '@/types/project';

interface ProjectEmbedProps {
  slug: string;
  title: string;
  embedUrl: string;
  links: ProjectLink[];
  locale: string;
  backLabel: string;
}

export default function ProjectEmbed({
  slug,
  title,
  embedUrl,
  links,
  locale,
  backLabel,
}: ProjectEmbedProps) {
  const startRef = useRef(Date.now());

  useEffect(() => {
    trackEvent('project_view', { project_slug: slug, project_title: title });
    return () => {
      const seconds = Math.round((Date.now() - startRef.current) / 1000);
      trackEvent('project_time_spent', { project_slug: slug, seconds });
    };
  }, [slug, title]);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 3.5rem)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-2 border-b border-line-default">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/${locale}/projects`}
            className="text-sm text-text-muted hover:text-accent transition-colors flex-shrink-0"
          >
            &larr; {backLabel}
          </Link>
          <span className="text-sm font-medium text-text-primary truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2 py-1 rounded border border-line-default text-text-muted hover:text-accent hover:border-accent/40 transition-colors"
              onClick={() =>
                trackEvent('project_link_click', {
                  project_slug: slug,
                  link_type: link.type,
                  link_url: link.url,
                })
              }
            >
              {link.label || link.type}
            </a>
          ))}
        </div>
      </div>

      {/* Iframe */}
      <iframe
        src={embedUrl}
        className="flex-1 w-full border-0"
        title={title}
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
