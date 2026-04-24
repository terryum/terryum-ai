'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface ProjectEmbedProps {
  slug: string;
  title: string;
  embedUrl: string;
  locale: string;
}

export default function ProjectEmbed({
  slug,
  title,
  embedUrl,
  locale,
}: ProjectEmbedProps) {
  const startRef = useRef(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Capture initial chapter/scroll once per mount. Subsequent scroll updates
  // flow through router.replace() and must NOT re-trigger iframe reloads.
  const initialRef = useRef<{ chapter: string; scrollY: number }>({
    chapter: searchParams.get('chapter') ?? '',
    scrollY: Number(searchParams.get('y')) || 0,
  });

  const iframeSrc = useMemo(() => {
    const chapter = initialRef.current.chapter;
    return `${embedUrl}${locale}/${chapter}`;
  }, [embedUrl, locale]);

  const embedOrigin = useMemo(() => {
    try {
      return new URL(embedUrl).origin;
    } catch {
      return '';
    }
  }, [embedUrl]);

  useEffect(() => {
    trackEvent('project_view', { project_slug: slug, project_title: title });

    const footer = document.querySelector('footer');
    if (footer) (footer as HTMLElement).style.display = 'none';

    return () => {
      const seconds = Math.round((Date.now() - startRef.current) / 1000);
      trackEvent('project_time_spent', { project_slug: slug, seconds });
      if (footer) (footer as HTMLElement).style.display = '';
    };
  }, [slug, title]);

  // Promote iframe's internal location to parent URL query params so the
  // language switcher (which preserves query params) can round-trip back.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (embedOrigin && e.origin !== embedOrigin) return;
      const data = e.data;
      if (!data || data.type !== 'survey_location') return;

      const chapter = typeof data.chapter === 'string' ? data.chapter : '';
      const scrollY = Number(data.scrollY) || 0;

      const params = new URLSearchParams(window.location.search);
      if (chapter) params.set('chapter', chapter);
      else params.delete('chapter');
      if (scrollY > 50) params.set('y', String(Math.round(scrollY)));
      else params.delete('y');

      const qs = params.toString();
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (nextUrl !== currentUrl) {
        router.replace(nextUrl, { scroll: false });
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [embedOrigin, pathname, router]);

  function handleIframeLoad() {
    const y = initialRef.current.scrollY;
    if (y <= 0) return;
    const win = iframeRef.current?.contentWindow;
    if (!win || !embedOrigin) return;
    // Slight delay so the chapter's layout (images, GSAP) settles before scroll.
    setTimeout(() => {
      try {
        win.postMessage({ type: 'restore_scroll', scrollY: y }, embedOrigin);
      } catch {
        // ignore cross-origin edge cases
      }
    }, 100);
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 3.5rem)' }}>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        onLoad={handleIframeLoad}
        className="flex-1 w-full border-0"
        title={title}
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
