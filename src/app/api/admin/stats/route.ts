import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, importPKCS8 } from 'jose';
import { isAdminFromRequest } from '@/lib/identity';

export const runtime = 'nodejs';

// GA4 Data API is called via REST (not the @google-analytics/data gRPC SDK)
// so the route works on Cloudflare Workers, where gRPC over HTTP/2 is not viable.

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

interface GA4Row {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
}

interface GA4ReportResponse {
  rows?: GA4Row[];
}

function loadServiceAccount(): ServiceAccount {
  const encoded = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!encoded) throw new Error('GA4_SERVICE_ACCOUNT_JSON is not set');
  const json = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  if (!json.client_email || !json.private_key) {
    throw new Error('Service account JSON missing client_email or private_key');
  }
  return { client_email: json.client_email, private_key: json.private_key };
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const privateKey = await importPKCS8(sa.private_key, 'RS256');
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/analytics.readonly' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`OAuth token exchange failed (${tokenRes.status}): ${text.slice(0, 200)}`);
  }
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error('OAuth token exchange returned no access_token');
  return access_token;
}

async function runReport(propertyId: string, token: string, body: Record<string, unknown>): Promise<GA4ReportResponse> {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 runReport ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<GA4ReportResponse>;
}

const PERIOD_MAP: Record<string, string> = {
  '7d': '7daysAgo',
  '30d': '30daysAgo',
  '90d': '90daysAgo',
};

export async function GET(request: NextRequest) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const propertyId = process.env.GA4_PROPERTY_ID;
  if (!propertyId) {
    return NextResponse.json({ error: 'GA4_PROPERTY_ID not configured' }, { status: 500 });
  }

  const period = request.nextUrl.searchParams.get('period') || '7d';
  const startDate = PERIOD_MAP[period] || '7daysAgo';
  const dateRanges = [{ startDate, endDate: 'today' }];

  try {
    const sa = loadServiceAccount();
    const token = await getAccessToken(sa);

    const [kpiRes, trendRes, sourcesRes, countriesRes, postsRes] = await Promise.all([
      runReport(propertyId, token, {
        dateRanges,
        metrics: [
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
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

    const kpiRow = kpiRes.rows?.[0];
    const kpi = {
      visitors: Number(kpiRow?.metricValues?.[0]?.value ?? 0),
      pageviews: Number(kpiRow?.metricValues?.[1]?.value ?? 0),
      engagementRate: Number(kpiRow?.metricValues?.[2]?.value ?? 0),
      avgSessionDuration: Number(kpiRow?.metricValues?.[3]?.value ?? 0),
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

    const posts = (postsRes.rows ?? []).map((row) => {
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
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('[admin/stats] GA4 REST failed:', err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: 'Failed to fetch analytics data', detail }, { status: 500 });
  }
}
