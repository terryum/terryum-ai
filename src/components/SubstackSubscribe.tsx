interface SubstackSubscribeProps {
  locale: 'ko' | 'en';
  variant?: 'article' | 'footer';
}

const SUBSTACK_URLS = {
  en: process.env.NEXT_PUBLIC_SUBSTACK_EN_URL ?? '',
  ko: process.env.NEXT_PUBLIC_SUBSTACK_KO_URL ?? '',
};

const LABELS = {
  en: {
    headline: 'Subscribe to On the Manifold',
    description: 'New essays and tech posts — delivered to your inbox.',
    button: 'Subscribe on Substack',
  },
  ko: {
    headline: 'On the Manifold 구독하기',
    description: '새 에세이와 테크 포스트를 뉴스레터로 받아보세요.',
    button: 'Substack 구독하기',
  },
};

export default function SubstackSubscribe({
  locale,
  variant = 'article',
}: SubstackSubscribeProps) {
  const url = SUBSTACK_URLS[locale];
  const labels = LABELS[locale];

  if (!url) return null;

  const subscribeUrl = url.endsWith('/') ? `${url}subscribe` : `${url}/subscribe`;

  if (variant === 'footer') {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-text-muted">{labels.description}</span>
        <a
          href={subscribeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-accent hover:underline transition-colors whitespace-nowrap"
        >
          {labels.button} →
        </a>
      </div>
    );
  }

  // article variant
  return (
    <div className="mt-12 pt-8 border-t border-line-default">
      <div className="bg-surface-subtle rounded-xl px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary text-base leading-snug">
            {labels.headline}
          </p>
          <p className="text-sm text-text-muted mt-1">{labels.description}</p>
        </div>
        <a
          href={subscribeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {labels.button}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
