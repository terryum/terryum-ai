import type { SurveyMeta } from '@/types/survey';
import surveysBundle from '../../projects/surveys/surveys.json';

/**
 * Internal raw view: includes private URLs (embed_url, links) for restricted
 * surveys. Only call after verifying the caller is authorized (e.g., in the
 * detail page after requireReadAccess passes).
 */
function loadSurveysRaw(): SurveyMeta[] {
  return (surveysBundle as unknown as { surveys: SurveyMeta[] }).surveys;
}

/**
 * Strip private URLs from non-public surveys so they don't leak into
 * client-rendered HTML / RSC payloads. Title / cover / TOC stay public per
 * product policy; only embed_url and external links are redacted because
 * those are the ones that bypass the auth gate.
 */
function sanitizeRestrictedSurvey(s: SurveyMeta): SurveyMeta {
  const visibility = s.visibility ?? 'public';
  if (visibility === 'public') return s;
  return { ...s, embed_url: undefined, links: [] };
}

export async function loadPublicSurveys(): Promise<SurveyMeta[]> {
  return loadSurveysRaw().map(sanitizeRestrictedSurvey);
}

/** All surveys (public + private/group) with private URLs redacted. */
export async function getAllSurveys(): Promise<SurveyMeta[]> {
  const surveys = (await loadPublicSurveys()).slice();
  return surveys.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

/**
 * Detail page view: returns the full raw SurveyMeta including embed_url.
 * The caller must run requireReadAccess before handing embed_url to the iframe.
 */
export async function getSurvey(slug: string): Promise<SurveyMeta | null> {
  return loadSurveysRaw().find((s) => s.slug === slug) ?? null;
}
