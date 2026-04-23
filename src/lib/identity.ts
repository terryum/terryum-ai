/**
 * Identity session: Google OAuth-backed user session.
 * Replaces the legacy password-based admin-session.
 *
 * Cookie: `id-session` (HMAC-signed), set on `.terryum.ai` in production
 * so `www.terryum.ai` and `stock.terryum.ai` share the same session.
 */
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { signToken, verifyToken, isTokenExpired, cookieOptions } from './auth-common';

export const ID_COOKIE_NAME = 'id-session';
export const ID_SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function cookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== 'production') return undefined;
  // Shared across www.terryum.ai + stock.terryum.ai
  return '.terryum.ai';
}

export function signIdentityToken(email: string): string {
  return signToken(`user:${email}:${Date.now()}`);
}

export function verifyIdentityToken(token: string): { email: string } | null {
  const result = verifyToken(token);
  if (!result) return null;
  const match = result.payload.match(/^user:([^:]+):(\d+)$/);
  if (!match) return null;
  if (isTokenExpired(Number(match[2]), ID_SESSION_MAX_AGE)) return null;
  return { email: match[1] };
}

export async function getCurrentUser(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ID_COOKIE_NAME)?.value;
  return token ? verifyIdentityToken(token) : null;
}

export function getCurrentUserFromRequest(request: NextRequest): { email: string } | null {
  const token = request.cookies.get(ID_COOKIE_NAME)?.value;
  return token ? verifyIdentityToken(token) : null;
}

function getAdminEmail(): string {
  const email = process.env.ADMIN_EMAIL;
  if (!email) throw new Error('ADMIN_EMAIL is not set');
  return email.toLowerCase();
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.email.toLowerCase() === getAdminEmail();
}

export function isAdminFromRequest(request: NextRequest): boolean {
  const user = getCurrentUserFromRequest(request);
  if (!user) return false;
  return user.email.toLowerCase() === getAdminEmail();
}

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase() === getAdminEmail();
}

export function identityCookieOptions(token: string) {
  return cookieOptions(ID_COOKIE_NAME, token, ID_SESSION_MAX_AGE, cookieDomain());
}

export function deleteIdentityCookieOptions() {
  return cookieOptions(ID_COOKIE_NAME, '', 0, cookieDomain());
}
