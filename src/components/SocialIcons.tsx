'use client';

import { useState } from 'react';
import { SITE_CONFIG } from '@/lib/site-config';
import { GoogleScholarIcon, LinkedInIcon } from '@/components/SocialIconGlyphs';

// Emails are split to prevent bot harvesting from static HTML.
// First entry is the primary (used for mailto on touch devices).
const EMAIL_PARTS: readonly (readonly [string, string])[] = [
  ['terry', 'cosmax.com'],
  ['terry', 'artlab.ai'],
];

/** 기본 노출 아이콘 (순서대로) */
const PRIMARY_NAMES = ['GitHub', 'LinkedIn', 'Facebook', 'Instagram', 'X', 'Google Scholar'];

const socialLinks = [
  {
    name: 'GitHub',
    href: SITE_CONFIG.social.github,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    name: 'LinkedIn',
    href: SITE_CONFIG.social.linkedin,
    icon: <LinkedInIcon />,
  },
  {
    name: 'Facebook',
    href: SITE_CONFIG.social.facebook,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    name: 'Instagram',
    href: SITE_CONFIG.social.instagram,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z" />
      </svg>
    ),
  },
  {
    name: 'X',
    href: SITE_CONFIG.social.x,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    name: 'Google Scholar',
    href: SITE_CONFIG.social.googleScholar,
    icon: <GoogleScholarIcon />,
  },
  // ── 더보기(⋯) 메뉴 안에 표시되는 아이콘 ──
  {
    name: 'Threads',
    href: SITE_CONFIG.social.threads,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.779-.962-1.41-1.783-1.824-.3 2.294-1.03 4.038-2.196 5.168-1.208 1.17-2.782 1.737-4.678 1.687-1.478-.038-2.74-.56-3.65-1.51-.865-.9-1.34-2.09-1.376-3.448-.064-2.453 1.56-4.334 4.12-4.77a11.5 11.5 0 0 1 1.59-.12c1.2-.005 2.293.17 3.27.532.098-.56.16-1.15.183-1.765H11.83V7.126h6.653l.028.196c.2 1.382.121 3.16-.358 5.17.56.254 1.063.574 1.498.96 1.037.92 1.676 2.2 1.843 3.697.27 2.426-.417 4.725-2.085 6.388-1.874 1.866-4.428 2.76-7.222 2.463zm-1.584-6.052c.834.02 1.605-.213 2.22-.67.69-.511 1.166-1.322 1.463-2.482a7.3 7.3 0 0 0-2.527-.437c-.34.003-.662.023-.963.063-1.34.228-2.088 1.03-2.06 2.112.046 1.387 1.079 1.396 1.867 1.414z" />
      </svg>
    ),
  },
  {
    name: 'YouTube',
    href: SITE_CONFIG.social.youtube,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    name: 'Bluesky',
    href: SITE_CONFIG.social.bluesky,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.6 3.476 6.158 3.13-4.58.794-6.091 3.427-3.426 6.075 5.017 4.996 7.212-1.252 8.14-3.695a5.4 5.4 0 0 0 .326-1.189c.05.386.134.774.326 1.189.927 2.443 3.122 8.69 8.14 3.695 2.665-2.648 1.154-5.28-3.426-6.075 2.558.346 5.373-.503 6.158-3.13.246-.828.624-5.788.624-6.479 0-.688-.139-1.86-.902-2.203-.659-.3-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8" />
      </svg>
    ),
  },
  {
    name: 'Substack',
    href: SITE_CONFIG.social.substack,
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24l9.54-5.512L20.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
      </svg>
    ),
  },
  {
    name: 'Email',
    href: '#', // resolved at click time to prevent scraping
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

const primaryLinks = socialLinks.filter((l) => PRIMARY_NAMES.includes(l.name));
const secondaryLinks = socialLinks.filter((l) => !PRIMARY_NAMES.includes(l.name));

export default function SocialIcons({ className = '' }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleEmailClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const addrs = EMAIL_PARTS.map(([l, d]) => `${l}@${d}`);
    const primary = addrs[0];

    const isTouchDevice = window.matchMedia(
      '(hover: none) and (pointer: coarse)',
    ).matches;

    if (isTouchDevice) {
      // mailto: only supports a single address reliably; use the primary.
      window.location.href = `mailto:${primary}`;
    } else {
      // Desktop: copy both addresses (newline-separated) so the user can paste either.
      navigator.clipboard.writeText(addrs.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function renderLink(link: (typeof socialLinks)[number]) {
    if (link.name === 'Email') {
      return (
        <span key={link.name} className="relative">
          <a
            href="#"
            onClick={handleEmailClick}
            className="text-text-muted hover:text-accent transition-colors"
            aria-label={link.name}
          >
            {link.icon}
          </a>
          {copied && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-accent px-2 py-0.5 text-xs text-white animate-fade-in">
              Copied!
            </span>
          )}
        </span>
      );
    }
    return (
      <a
        key={link.name}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-muted hover:text-accent transition-colors"
        aria-label={link.name}
      >
        {link.icon}
      </a>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {primaryLinks.map(renderLink)}
      {expanded && secondaryLinks.map(renderLink)}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-text-muted hover:text-accent transition-colors text-lg leading-none"
        aria-label={expanded ? 'Show fewer links' : 'Show more links'}
      >
        {expanded ? '−' : '⋯'}
      </button>
    </div>
  );
}
