import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/site-config';

interface FooterProps {
  copyright: string;
  locale: string;
}

export default function Footer({ copyright, locale }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line-default mt-16">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="font-semibold text-text-primary tracking-tight hover:text-accent transition-colors"
          >
            {SITE_CONFIG.name}
          </Link>
          <p className="text-sm text-text-muted">
            &copy; {year} {copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
