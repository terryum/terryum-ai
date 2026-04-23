/**
 * Google OAuth helpers.
 * Confidential client flow (no PKCE): redirect → code → id_token exchange → JWKS verify.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import crypto from 'crypto';
import { signToken, verifyToken } from './auth-common';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUER = 'https://accounts.google.com';

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

export interface StateData {
  redirect: string;
  nonce: string;
}

function getClientId(): string {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!id) throw new Error('GOOGLE_OAUTH_CLIENT_ID is not set');
  return id;
}

function getClientSecret(): string {
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!secret) throw new Error('GOOGLE_OAUTH_CLIENT_SECRET is not set');
  return secret;
}

export function getRedirectUri(requestOrigin: string): string {
  return `${requestOrigin}/api/auth/google/callback`;
}

export function signState(data: StateData): string {
  return signToken(`state:${encodeURIComponent(data.redirect)}:${data.nonce}`);
}

export function verifyState(token: string): StateData | null {
  const result = verifyToken(token);
  if (!result) return null;
  const match = result.payload.match(/^state:([^:]+):([a-f0-9]+)$/);
  if (!match) return null;
  return { redirect: decodeURIComponent(match[1]), nonce: match[2] };
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  id_token: string;
  access_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

export interface GoogleIdentity {
  email: string;
  emailVerified: boolean;
  sub: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: [GOOGLE_ISSUER, 'accounts.google.com'],
    audience: getClientId(),
  });
  const email = payload.email;
  if (typeof email !== 'string') throw new Error('id_token missing email claim');
  const emailVerified = payload.email_verified === true;
  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  return { email, emailVerified, sub };
}

/**
 * Validate that a redirect target is safe — an absolute URL on a trusted host,
 * or a root-relative path.
 */
export function safeRedirect(target: string | undefined | null): string {
  if (!target) return '/';
  if (target.startsWith('/') && !target.startsWith('//')) return target;
  try {
    const url = new URL(target);
    const host = url.host;
    const allowed =
      host === 'www.terryum.ai' ||
      host === 'terryum.ai' ||
      host === 'stock.terryum.ai' ||
      /^localhost(:\d+)?$/.test(host);
    return allowed ? url.toString() : '/';
  } catch {
    return '/';
  }
}
