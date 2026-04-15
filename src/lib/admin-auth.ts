import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { RateLimiter, verifyPassword as verifyPw, signToken, verifyToken, isTokenExpired, cookieOptions } from './auth-common';

const COOKIE_NAME = 'admin-session';
const rateLimiter = new RateLimiter();

export function checkRateLimit(ip: string): boolean {
  return rateLimiter.check(ip);
}

export function verifyPassword(input: string): boolean {
  return verifyPw(input, process.env.ADMIN_PASSWORD);
}

export function signSessionToken(): string {
  return signToken(`admin:${Date.now()}`);
}

export function verifySessionToken(token: string): boolean {
  const result = verifyToken(token);
  if (!result) return false;
  const match = result.payload.match(/^admin:(\d+)$/);
  if (!match) return false;
  return !isTokenExpired(Number(match[1]));
}

export function isAdminRequest(request: NextRequest): boolean {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : false;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : false;
}

export function sessionCookieOptions(token: string) {
  return cookieOptions(COOKIE_NAME, token);
}

export function deleteCookieOptions() {
  return cookieOptions(COOKIE_NAME, '', 0);
}
