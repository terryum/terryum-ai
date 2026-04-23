import { NextRequest, NextResponse } from 'next/server';
import { buildGoogleAuthUrl, generateNonce, getRedirectUri, safeRedirect, signState } from '@/lib/oauth';

const STATE_COOKIE = 'oauth-state';
const STATE_TTL_SECONDS = 600; // 10 minutes

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const redirectTarget = safeRedirect(url.searchParams.get('redirect'));
  const nonce = generateNonce();
  const state = signState({ redirect: redirectTarget, nonce });
  const redirectUri = getRedirectUri(url.origin);
  const authUrl = buildGoogleAuthUrl(state, redirectUri);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: STATE_COOKIE,
    value: nonce,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL_SECONDS,
    path: '/',
  });
  return response;
}
