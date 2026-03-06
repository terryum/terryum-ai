import { notFound } from 'next/navigation';
import { isValidLocale, type Locale } from '@/lib/i18n';
import { getDictionary } from '@/lib/dictionaries';
import { getAllPosts } from '@/lib/posts';
import { getNavTabs } from '@/lib/tabs';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isValidLocale(lang)) {
    notFound();
  }

  const dict = await getDictionary(lang as Locale);
  const posts = await getAllPosts(lang);
  const navTabs = getNavTabs(posts, lang);

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-to-content">
        Skip to content
      </a>
      <Header locale={lang as Locale} dict={dict} navTabs={navTabs} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer copyright={dict.footer.copyright} locale={lang} />
    </div>
  );
}
