'use client';
import { useEffect } from 'react';

export default function AutoRedirect({ slug }: { slug: string }) {
  useEffect(() => {
    const cookie = document.cookie.match(/preferred-lang=([^;]+)/)?.[1];
    const lang =
      cookie === 'ko' || cookie === 'en'
        ? cookie
        : navigator.language.toLowerCase().startsWith('ko')
          ? 'ko'
          : 'en';
    window.location.replace(`/${lang}/posts/${slug}`);
  }, [slug]);
  return null;
}
