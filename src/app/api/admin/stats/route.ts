import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

function getClient(): BetaAnalyticsDataClient {
  const json = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!json) throw new Error('GA4_SERVICE_ACCOUNT_JSON is not set');
  const credentials = JSON.parse(Buffer.from(json, 'base64').toString('utf-8'));
  return new BetaAnalyticsDataClient({ credentials });
}

const PERIOD_MAP: Record<string, string> = {
  '7d': '7daysAgo',
  '30d': '30daysAgo',
  '90d': '90daysAgo',
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    return NextResponse.json({ error: 'GA4_PROPERTY_ID not configured' }, { status: 500 });
  }

  const period = request.nextUrl.searchParams.get('period') || '7d';
  const startDate = PERIOD_MAP[period] || '7daysAgo';
  const property = `properties/${propertyId}`;
  const dateRanges = [{ startDate, endDate: 'today' }];

  try {
    const client = getClient();

    const [kpiRes, trendRes, sourcesRes, countriesRes, postsRes] = await Promise.all([
      // 1. KPI
      client.runReport({
        property,
        dateRanges,
        metrics: [
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
        ],
      }),

      // 2. 일별 트렌드
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'totalUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),

      // 3. 유입경로 (source/medium)
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      }),

      // 4. 국가별 방문자
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'totalUsers' }],
        orderBys: [{ metric: { metricName: 'totalUsers' }, desc: true }],
        limit: 10,
      }),

      // 5. 포스팅별 조회수 (ko/en 분리)
      client.runReport({
        property,
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'totalUsers' },
          { name: 'averageSessionDuration' },
        ],
        dimensionFilter: {
          orGroup: {
            expressions: [
              {
                filter: {
                  fieldName: 'pagePath',
                  stringFilter: { matchType: 'BEGINS_WITH', value: '/ko/posts/' },
                },
              },
              {
                filter: {
                  fieldName: 'pagePath',
                  stringFilter: { matchType: 'BEGINS_WITH', value: '/en/posts/' },
                },
              },
            ],
          },
        },
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 30,
      }),
    ]);

    const kpiRow = kpiRes[0].rows?.[0];
    const kpi = {
      visitors: Number(kpiRow?.metricValues?.[0]?.value ?? 0),
      pageviews: Number(kpiRow?.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(kpiRow?.metricValues?.[2]?.value ?? 0),
      avgSessionDuration: Number(kpiRow?.metricValues?.[3]?.value ?? 0),
    };

    const trend = (trendRes[0].rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      visitors: Number(row.metricValues?.[0]?.value ?? 0),
      pageviews: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const sources = (sourcesRes[0].rows ?? []).map((row) => ({
      source: row.dimensionValues?.[0]?.value ?? '',
      medium: row.dimensionValues?.[1]?.value ?? '',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      visitors: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    const countries = (countriesRes[0].rows ?? []).map((row) => ({
      country: row.dimensionValues?.[0]?.value ?? '',
      visitors: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    const posts = (postsRes[0].rows ?? []).map((row) => {
      const path = row.dimensionValues?.[0]?.value ?? '';
      const match = path.match(/^\/(ko|en)\/posts\/(.+)$/);
      return {
        path,
        locale: match?.[1] ?? '',
        slug: match?.[2] ?? path,
        pageviews: Number(row.metricValues?.[0]?.value ?? 0),
        visitors: Number(row.metricValues?.[1]?.value ?? 0),
        avgDuration: Number(row.metricValues?.[2]?.value ?? 0),
      };
    });

    return NextResponse.json({ kpi, trend, sources, countries, posts, period });
  } catch (err) {
    console.error('GA4 API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
