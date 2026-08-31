import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/identity';
import {
  loadServiceAccount,
  getAccessToken,
  runReport,
  fetchPropertyCreateDate,
} from '@/lib/ga4-stats';
import { getSupabaseAdmin } from '@/lib/supabase';
import { formatPostNumber, formatSurveyLabel, formatProjectNumber } from '@/lib/numbering';
import postsIndex from '../../../../../posts/index.json';
import surveysBundle from '../../../../../projects/surveys/surveys.json';
import projectsBundle from '../../../../../projects/gallery/projects.json';

export const runtime = 'nodejs';

interface TitleEntry {
  number: string;
  title_ko: string;
  title_en: string;
}

const POST_ENTRIES = new Map<string, TitleEntry>(
  (postsIndex as { posts: Array<{ slug: string; post_number: number; title_ko?: string; title_en?: string }> }).posts
    .map((p) => [p.slug, { number: formatPostNumber(p.post_number), title_ko: p.title_ko ?? p.slug, title_en: p.title_en ?? p.slug }]),
);
const SURVEY_ENTRIES = new Map<string, TitleEntry>(
  (surveysBundle as { surveys: Array<{ slug: string; survey_number?: number | null; tutorial_number?: number; content_type?: string; title?: { ko?: string; en?: string } }> }).surveys
    .map((s) => [s.slug, { number: formatSurveyLabel(s), title_ko: s.title?.ko ?? s.slug, title_en: s.title?.en ?? s.slug }]),
);
const PROJECT_ENTRIES = new Map<string, TitleEntry>(
  (projectsBundle as { projects: Array<{ slug: string; project_number?: number; title?: { ko?: string; en?: string } }> }).projects
    .filter((p): p is { slug: string; project_number: number; title?: { ko?: string; en?: string } } => p.project_number != null)
    .map((p) => [p.slug, { number: formatProjectNumber(p.project_number), title_ko: p.title?.ko ?? p.slug, title_en: p.title?.en ?? p.slug }]),
);

function lookupEntry(kind: string, slug: string): TitleEntry | null {
  if (kind === 'posts') return POST_ENTRIES.get(slug) ?? null;
  if (kind === 'surveys') return SURVEY_ENTRIES.get(slug) ?? null;
  if (kind === 'projects') return PROJECT_ENTRIES.get(slug) ?? null;
  return null;
}

const PERIOD_MAP: Record<string, string> = {
  '7d': '7daysAgo',
  '30d': '30daysAgo',
  '90d': '90daysAgo',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function presetStartIso(period: string): string {
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    return NextResponse.json({ error: 'GA4_PROPERTY_ID not configured' }, { status: 500 });
  }

  const sp = request.nextUrl.searchParams;
  const period = sp.get('period') || '7d';
  const today = todayIso();

  let startDate: string;
  let endDate: string;

  if (period === 'custom') {
    const s = sp.get('startDate') ?? '';
    const e = sp.get('endDate') ?? '';
    if (!DATE_RE.test(s) || !DATE_RE.test(e)) {
      return NextResponse.json({ error: 'Invalid date format (YYYY-MM-DD required)' }, { status: 400 });
    }
    if (s > e) {
      return NextResponse.json({ error: 'startDate must be on or before endDate' }, { status: 400 });
    }
    if (e > today) {
      return NextResponse.json({ error: 'endDate cannot be in the future' }, { status: 400 });
    }
    if (s < '2020-01-01') {
      return NextResponse.json({ error: 'startDate cannot be before 2020-01-01' }, { status: 400 });
    }
    startDate = s;
    endDate = e;
  } else if (period === 'all') {
    startDate = process.env.GA4_START_DATE ?? '2020-01-01';
    endDate = today;
  } else if (PERIOD_MAP[period]) {
    startDate = presetStartIso(period);
    endDate = today;
  } else {
    startDate = presetStartIso('7d');
    endDate = today;
  }

  const dateRanges = [{ startDate, endDate }];

  try {
    const sa = loadServiceAccount();
    const token = await getAccessToken(sa);

    if (period === 'all' && !process.env.GA4_START_DATE) {
      const created = await fetchPropertyCreateDate(propertyId, token);
      if (created) {
        startDate = created;
        dateRanges[0].startDate = created;
      }
    }

    const postPathFilter = {
      orGroup: {
        expressions: [
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/ko/posts/' } } },
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/en/posts/' } } },
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/ko/surveys/' } } },
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/en/surveys/' } } },
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/ko/projects/' } } },
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/en/projects/' } } },
        ],
      },
    } as const;

    const [
      kpiRes,
      trendRes,
      sourcesRes,
      countriesRes,
      devicesRes,
      postsRes,
      postSourcesRes,
      commentsRes,
    ] = await Promise.all([
      runReport(propertyId, token, {
        dateRanges,
        metrics: [
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'userEngagementDuration' },
        ],
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
        limit: 10,
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'userEngagementDuration' },
          { name: 'engagementRate' },
        ],
        dimensionFilter: postPathFilter,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 60,
      }),
      runReport(propertyId, token, {
        dateRanges,
        dimensions: [{ name: 'pagePath' }, { name: 'sessionSource' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: postPathFilter,
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 500,
      }),
      getSupabaseAdmin()
        .from('post_comments_public')
        .select('post_slug')
        .then(
          (r) => r,
          () => ({ data: null, error: null }),
        ),
    ]);

    const kpiRow = kpiRes.rows?.[0];
    const totalUsers = Number(kpiRow?.metricValues?.[0]?.value ?? 0);
    const newUsers = Number(kpiRow?.metricValues?.[1]?.value ?? 0);
    const engagementSeconds = Number(kpiRow?.metricValues?.[4]?.value ?? 0);
    const kpi = {
      visitors: totalUsers,
      newUsers,
      returningUsers: Math.max(0, totalUsers - newUsers),
      newUserRate: totalUsers > 0 ? newUsers / totalUsers : 0,
      pageviews: Number(kpiRow?.metricValues?.[2]?.value ?? 0),
      engagementRate: Number(kpiRow?.metricValues?.[3]?.value ?? 0),
      avgEngagementPerUser: totalUsers > 0 ? engagementSeconds / totalUsers : 0,
    };

    const trend = (trendRes.rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      visitors: Number(row.metricValues?.[0]?.value ?? 0),
      pageviews: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const sources = (sourcesRes.rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? '',
      medium: row.dimensionValues?.[1]?.value ?? '',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      visitors: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const countries = (countriesRes.rows ?? []).map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? '',
      visitors: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    const devices = (devicesRes.rows ?? []).map((row) => ({
      device: row.dimensionValues?.[0]?.value ?? '',
      visitors: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    // Build per-path referrer breakdown (top 5 sources per page)
    const referrersByPath = new Map<string, { source: string; pageviews: number }[]>();
    for (const row of postSourcesRes.rows ?? []) {
      const path = row.dimensionValues?.[0]?.value ?? '';
      const source = row.dimensionValues?.[1]?.value ?? '(direct)';
      const pageviews = Number(row.metricValues?.[0]?.value ?? 0);
      const list = referrersByPath.get(path) ?? [];
      list.push({ source, pageviews });
      referrersByPath.set(path, list);
    }
    for (const list of referrersByPath.values()) {
      list.sort((a, b) => b.pageviews - a.pageviews);
    }

    // Build comment-count map per slug
    const commentsBySlug = new Map<string, number>();
    for (const row of (commentsRes.data ?? []) as Array<{ post_slug?: string }>) {
      const slug = row.post_slug;
      if (!slug) continue;
      commentsBySlug.set(slug, (commentsBySlug.get(slug) ?? 0) + 1);
    }

    const posts = (postsRes.rows ?? [])
      .map((row) => {
        const path = row.dimensionValues?.[0]?.value ?? '';
        const match = path.match(/^\/(ko|en)\/(posts|surveys|projects)\/(.+)$/);
        const locale = match?.[1] ?? '';
        const kind = match?.[2] ?? 'posts';
        const slug = match?.[3] ?? path;
        const entry = lookupEntry(kind, slug);
        if (!entry) return null;
        const pageviews = Number(row.metricValues?.[0]?.value ?? 0);
        const visitors = Number(row.metricValues?.[1]?.value ?? 0);
        const engagementSeconds = Number(row.metricValues?.[2]?.value ?? 0);
        const engagementRate = Number(row.metricValues?.[3]?.value ?? 0);
        return {
          path,
          locale,
          slug,
          number: entry.number,
          title: locale === 'ko' ? entry.title_ko : entry.title_en,
          pageviews,
          visitors,
          avgEngagement: visitors > 0 ? engagementSeconds / visitors : 0,
          engagementRate,
          commentCount: commentsBySlug.get(slug) ?? 0,
          referrers: (referrersByPath.get(path) ?? []).slice(0, 5),
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .slice(0, 30);

    return NextResponse.json({
      kpi,
      trend,
      sources,
      countries,
      devices,
      posts,
      period,
      dateRange: { startDate, endDate },
    });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('[admin/stats] GA4 REST failed:', err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: 'Failed to fetch analytics data', detail }, { status: 500 });
  }
}
