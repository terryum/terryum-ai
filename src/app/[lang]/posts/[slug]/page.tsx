// MINIMAL DIAGNOSTIC — temporary. If /ko/posts/<snu-slug> still 500s with
// only this in place, the failure is infra-level (route, middleware, OpenNext
// bundling), not our detail page logic. If it returns 200, the failure is
// somewhere in buildContentDetailProps / ContentDetailPage / MDX.

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  console.log(`[page:minimal] ${slug} ${lang}`);
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Minimal diagnostic</h1>
      <p>lang: {lang}</p>
      <p>slug: {slug}</p>
    </div>
  );
}
