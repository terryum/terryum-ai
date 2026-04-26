'use client';

import { useEffect, useRef, useState } from 'react';

interface ContactEmailProps {
  // Email split into parts so the literal string never appears in SSR HTML.
  // The renderer joins them on the client after hydration.
  localPart: string;
  domain: string;
  fallbackLabel: string; // shown until JS hydrates (e.g. "Email")
}

// Renders a mailto link only after client-side hydration. The full email
// string is assembled in JS, so a non-JS bot only sees the data-* attributes
// and the placeholder label — never `local@domain` as a parseable token.
export default function ContactEmail({ localPart, domain, fallbackLabel }: ContactEmailProps) {
  const [email, setEmail] = useState<string | null>(null);
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setEmail(`${localPart}@${domain}`);
  }, [localPart, domain]);

  if (!email) {
    return (
      <a
        ref={ref}
        data-l={localPart}
        data-d={domain}
        className="text-sm text-text-primary hover:text-accent transition-colors underline-offset-2"
      >
        {fallbackLabel}
      </a>
    );
  }

  return (
    <a
      href={`mailto:${email}`}
      className="text-sm text-text-primary hover:text-accent transition-colors underline-offset-2"
    >
      {email}
    </a>
  );
}
