'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('preferred-lang');
    if (saved === 'ko' || saved === 'en') {
      router.replace(`/${saved}`);
      return;
    }
    const browserLang = navigator.language;
    const locale = browserLang.startsWith('ko') ? 'ko' : 'en';
    router.replace(`/${locale}`);
  }, [router]);

  return null;
}
