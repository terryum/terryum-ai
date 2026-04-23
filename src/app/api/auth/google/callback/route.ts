import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  getRedirectUri,
  safeRedirect,
  verifyGoogleIdToken,
  verifyState,
} from '@/lib/oauth';
import { identityCookieOptions, isAllowedEmail, signIdentityToken } from '@/lib/identity';

const STATE_COOKIE = 'oauth-state';

function errorRedirect(origin: string, code: string): NextResponse {
  const url = new URL('/login', origin);
  url.searchParams.set('error', code);
  const response = NextResponse.redirect(url);
  response.cookies.set({ name: STATE_COOKIE, value: '', maxAge: 0, path: '/' });
  return response;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  if (providerError) return errorRedirect(url.origin, providerError);
  if (!code || !stateParam) return errorRedirect(url.origin, 'missing_params');

  const state = verifyState(stateParam);
  if (!state) return errorRedirect(url.origin, 'invalid_state');

  const nonceCookie = request.cookies.get(STATE_COOKIE)?.value;
  if (!nonceCookie || nonceCookie !== state.nonce) {
    return errorRedirect(url.origin, 'state_mismatch');
  }

  const redirectUri = getRedirectUri(url.origin);
  let identity;
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    identity = await verifyGoogleIdToken(tokens.id_token);
  } catch (err) {
    console.error('[oauth] token verification failed:', err);
    return errorRedirect(url.origin, 'verify_failed');
  }

  if (!identity.emailVerified) return errorRedirect(url.origin, 'email_unverified');
  if (!isAllowedEmail(identity.email)) return errorRedirect(url.origin, 'unauthorized');

  const sessionToken = signIdentityToken(identity.email.toLowerCase());
  const target = safeRedirect(state.redirect);
  // Absolute URL needed for redirects across subdomains; fall back to origin for relative paths.
  const finalUrl = target.startsWith('/') ? new URL(target, url.origin).toString() : target;

  const response = NextResponse.redirect(finalUrl);
  response.cookies.set(identityCookieOptions(sessionToken));
  response.cookies.set({ name: STATE_COOKIE, value: '', maxAge: 0, path: '/' });
  return response;
}
