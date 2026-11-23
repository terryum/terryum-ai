import { NextRequest } from 'next/server';
import { isAdminFromRequest } from '@/lib/identity';
import { getSurvey } from '@/lib/surveys';

export const dynamic = 'force-dynamic';

const MAX_REDIRECTS = 5;
const PRIVATE_SURVEY_HOST = 'private-surveys.terryum.ai';
const FORWARDED_REQUEST_HEADERS = [
  'accept',
  'accept-encoding',
  'accept-language',
  'if-modified-since',
  'if-none-match',
  'range',
] as const;
const FORWARDED_RESPONSE_HEADERS = [
  'accept-ranges',
  'content-encoding',
  'content-language',
  'content-length',
  'content-range',
  'content-type',
  'etag',
  'last-modified',
] as const;

function hiddenNotFound(): Response {
  return new Response(null, {
    status: 404,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, noarchive',
    },
  });
}

function upstreamRequestHeaders(request: NextRequest, clientId: string, clientSecret: string): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('CF-Access-Client-Id', clientId);
  headers.set('CF-Access-Client-Secret', clientSecret);
  return headers;
}

function buildOriginUrl(embedUrl: string, path: string[], search: string): URL | null {
  let base: URL;
  try {
    base = new URL(embedUrl);
  } catch {
    return null;
  }
  if (base.protocol !== 'https:' || base.username || base.password) return null;
  if (path.some((segment) => segment === '.' || segment === '..' || /[\\/]/.test(segment))) {
    return null;
  }

  const basePath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  base.pathname = `${basePath}${path.map((segment) => encodeURIComponent(segment)).join('/')}`;
  base.search = search;
  base.hash = '';
  return base;
}

async function fetchSameOrigin(
  initialUrl: URL,
  method: 'GET' | 'HEAD',
  headers: Headers,
): Promise<Response | null> {
  let url = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const response = await fetch(url, { method, headers, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get('location');
    if (!location || redirectCount === MAX_REDIRECTS) return null;
    const nextUrl = new URL(location, url);
    if (nextUrl.origin !== initialUrl.origin) return null;
    url = nextUrl;
  }

  return null;
}

function protectedResponse(upstream: Response, method: 'GET' | 'HEAD'): Response {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Deliberately do not forward Set-Cookie, CF_Authorization, or any other
  // Access/internal response headers to the browser.
  headers.set('Cache-Control', 'private, no-store');
  headers.set('Content-Security-Policy', "frame-ancestors https://terryum.ai https://www.terryum.ai");
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Robots-Tag', 'noindex, noarchive');

  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

async function handle(
  request: NextRequest,
  context: { params: Promise<{ slug: string; path?: string[] }> },
  method: 'GET' | 'HEAD',
): Promise<Response> {
  const hostname = request.nextUrl.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  if (hostname !== PRIVATE_SURVEY_HOST && !isLocalhost) return hiddenNotFound();
  if (!isAdminFromRequest(request)) return hiddenNotFound();

  const { slug, path = [] } = await context.params;
  const survey = await getSurvey(slug);
  if (!survey) return hiddenNotFound();
  const wantsPreview = path[0] === '__preview';
  const origin = wantsPreview ? survey.preview_embed_url : survey.embed_url;
  const originPath = wantsPreview ? path.slice(1) : path;
  if (!origin || (!wantsPreview && survey.visibility !== 'private')) return hiddenNotFound();

  const clientId = process.env.CF_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('[private-surveys] Cloudflare Access Service Token is not configured');
    return new Response(null, {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '60' },
    });
  }

  const originUrl = buildOriginUrl(origin, originPath, request.nextUrl.search);
  if (!originUrl) return hiddenNotFound();

  let upstream: Response | null;
  try {
    upstream = await fetchSameOrigin(
      originUrl,
      method,
      upstreamRequestHeaders(request, clientId, clientSecret),
    );
  } catch (error) {
    console.error('[private-surveys] Origin request failed', error);
    upstream = null;
  }
  if (!upstream) {
    return new Response(null, {
      status: 502,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  return protectedResponse(upstream, method);
}

export function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; path?: string[] }> },
) {
  return handle(request, context, 'GET');
}

export function HEAD(
  request: NextRequest,
  context: { params: Promise<{ slug: string; path?: string[] }> },
) {
  return handle(request, context, 'HEAD');
}
