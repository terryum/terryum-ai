import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-20 text-center">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Page Not Found</h1>
      <p className="text-text-muted mb-8">
        The page you requested does not exist.
      </p>
      <Link
        href="/"
        className="text-sm text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
      >
        Back to Home
      </Link>
    </div>
  );
}
