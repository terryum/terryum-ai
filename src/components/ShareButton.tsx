'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function ShareButton() {
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  // "/ko/posts/some-slug" → "/posts/some-slug"
  const parts = pathname.split('/');
  const locale = parts[1]; // "ko" or "en"
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${parts.slice(2).join('/')}`
      : '';

  const toastText = locale === 'ko' ? '링크가 복사되었습니다' : 'Link copied!';

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="relative inline-flex items-center gap-1.5">
      <button
        onClick={handleCopy}
        className="w-8 h-8 rounded-full border border-line-default flex items-center justify-center text-text-muted hover:text-accent transition-colors"
        aria-label="Copy share link"
      >
        {copied ? (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        )}
      </button>
      <span
        className={`text-xs text-accent transition-opacity duration-300 pointer-events-none whitespace-nowrap ${
          copied ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {toastText}
      </span>
    </span>
  );
}
