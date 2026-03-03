import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function RootPage() {
  const headersList = await headers();
  const acceptLang = headersList.get('accept-language') || '';
  const locale = acceptLang.startsWith('ko') ? 'ko' : 'en';
  redirect(`/${locale}`);
}
