/**
 * Anonymous-visitor cookie used to deduplicate likes and rate-limit interactions.
 * Not a session — no privileges. The cookie is read by the client (httpOnly: false)
 * so the like button can render the user's previous like state without a round trip.
 */
import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

export const ANON_COOKIE_NAME = 'terry-anon';
const ANON_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function cookieDomain(): string | undefined {
  return process.env.NODE_ENV === 'production' ? '.terryum.ai' : undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readAnonId(request: NextRequest): string | null {
  const value = request.cookies.get(ANON_COOKIE_NAME)?.value;
  return value && UUID_RE.test(value) ? value : null;
}

export function issueAnonId(): string {
  return crypto.randomUUID();
}

export function setAnonCookie(response: NextResponse, value: string): void {
  response.cookies.set({
    name: ANON_COOKIE_NAME,
    value,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ANON_MAX_AGE,
    ...(cookieDomain() ? { domain: cookieDomain() } : {}),
  });
}

export function ensureAnonId(request: NextRequest, response: NextResponse): string {
  const existing = readAnonId(request);
  if (existing) return existing;
  const fresh = issueAnonId();
  setAnonCookie(response, fresh);
  return fresh;
}
