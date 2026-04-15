/**
 * Shared authentication utilities for admin-auth and group-auth.
 * Eliminates duplication of rate limiting, HMAC, and cookie logic.
 */
import crypto from 'crypto';

const MAX_AGE = 60 * 60 * 24; // 24 hours

/* ─── Rate Limiter ─── */
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private windowMs: number = 15 * 60 * 1000,
    private maxAttempts: number = 5,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || now > entry.resetAt) {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= this.maxAttempts;
  }
}

/* ─── Secret ─── */
export function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  return secret;
}

/* ─── Password Verification ─── */
export function verifyPassword(input: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(input.trim());
  const b = Buffer.from(expected.trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* ─── HMAC Token ─── */
export function signToken(payload: string): string {
  const hmac = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

export function verifyToken(token: string): { payload: string } | null {
  const lastDot = token.lastIndexOf('.');
  if (lastDot === -1) return null;

  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');

  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  return { payload };
}

export function isTokenExpired(issuedAt: number): boolean {
  return Date.now() - issuedAt > MAX_AGE * 1000;
}

/* ─── Cookie Options ─── */
export function cookieOptions(name: string, value: string, maxAge: number = MAX_AGE) {
  return {
    name,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  };
}
