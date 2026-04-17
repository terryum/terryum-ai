// Dynamic imports for auth — avoids pulling cookies() into static render path
import { isSupabaseAdminConfigured, getSupabaseAdmin } from '@/lib/supabase';
import type { SurveyMeta } from '@/types/survey';
import surveysBundle from '../../projects/surveys/surveys.json';

export async function loadPublicSurveys(): Promise<SurveyMeta[]> {
  return (surveysBundle as unknown as { surveys: SurveyMeta[] }).surveys;
}

async function getPrivateSurveys(groupSlug: string): Promise<SurveyMeta[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('private_content')
    .select('slug, title_ko, title_en, meta_json, cover_image_url, status')
    .eq('content_type', 'surveys')
    .eq('group_slug', groupSlug)
    .eq('status', 'published');
  if (error || !data) return [];
  return data.map(mapRowToSurveyMeta);
}

async function getAllPrivateSurveys(): Promise<SurveyMeta[]> {
  if (!isSupabaseAdminConfigured()) return [];
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('private_content')
    .select('slug, title_ko, title_en, meta_json, cover_image_url, status')
    .eq('content_type', 'surveys')
    .eq('status', 'published');
  if (error || !data) return [];
  return data.map(mapRowToSurveyMeta);
}

export async function getAllSurveys(): Promise<SurveyMeta[]> {
  const publicSurveys = await loadPublicSurveys();
  const surveys = [...publicSurveys];

  // Dynamic import to avoid cookies() in static path
  const { getAuthenticatedGroup, isAdminSession } = await import('@/lib/group-auth');
  const [group, admin] = await Promise.all([getAuthenticatedGroup(), isAdminSession()]);
  if (group || admin) {
    const privateSurveys = admin
      ? await getAllPrivateSurveys()
      : group ? await getPrivateSurveys(group) : [];
    const existingSlugs = new Set(surveys.map(s => s.slug));
    for (const ps of privateSurveys) {
      if (!existingSlugs.has(ps.slug)) surveys.push(ps);
    }
  }

  return surveys.sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getSurvey(slug: string): Promise<SurveyMeta | null> {
  const publicSurveys = await loadPublicSurveys();
  const survey = publicSurveys.find(s => s.slug === slug) ?? null;
  if (survey) return survey;

  // Fallback: Supabase (dynamic import)
  const { getAuthenticatedGroup, isAdminSession } = await import('@/lib/group-auth');
  const [group, admin] = await Promise.all([getAuthenticatedGroup(), isAdminSession()]);
  if (!group && !admin) return null;

  if (!isSupabaseAdminConfigured()) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('private_content')
    .select('slug, title_ko, title_en, meta_json, cover_image_url, status')
    .eq('slug', slug)
    .eq('content_type', 'surveys')
    .single();
  if (error || !data) return null;

  const privateSurvey = mapRowToSurveyMeta(data);
  if (privateSurvey.visibility === 'group' && !admin) {
    if (!group || !(privateSurvey.allowed_groups?.includes(group))) return null;
  }
  return privateSurvey;
}

function mapRowToSurveyMeta(row: {
  slug: string;
  title_ko: string;
  title_en: string;
  meta_json: Record<string, unknown>;
  cover_image_url: string | null;
}): SurveyMeta {
  const m = row.meta_json || {};
  return {
    slug: row.slug,
    survey_number: (m.survey_number as number) || 0,
    title: { ko: row.title_ko, en: row.title_en },
    description: (m.description as { ko: string; en: string }) || { ko: '', en: '' },
    cover_image: `/api/co/image/${row.slug}`,
    tech_stack: (m.tech_stack as string[]) || [],
    toc: (m.toc as { ko: string; en: string }[]) || [],
    links: (m.links as SurveyMeta['links']) || [],
    embed_url: m.embed_url as string | undefined,
    status: (m.status as SurveyMeta['status']) || 'active',
    featured: (m.featured as boolean) || false,
    order: (m.order as number) || 0,
    published_at: (m.published_at as string) || new Date().toISOString(),
    updated_at: (m.updated_at as string) || undefined,
    visibility: 'group',
    allowed_groups: (m.allowed_groups as string[]) || [],
  };
}
