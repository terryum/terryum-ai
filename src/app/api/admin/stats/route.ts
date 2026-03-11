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

  try {
    const client = getClient();

    // KPI metrics
    const [kpiResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
      ],
    });

    const kpiRow = kpiResponse.rows?.[0];
    const kpi = {
      visitors: Number(kpiRow?.metricValues?.[0]?.value ?? 0),
      pageviews: Number(kpiRow?.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(kpiRow?.metricValues?.[2]?.value ?? 0),
    };

    // Top pages
    const [pagesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20,
    });

    const topPages = (pagesResponse.rows ?? []).map((row) => ({
      path: row.dimensionValues?.[0]?.value ?? '',
      pageviews: Number(row.metricValues?.[0]?.value ?? 0),
      visitors: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    return NextResponse.json({ kpi, topPages, period });
  } catch (err) {
    console.error('GA4 API error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
