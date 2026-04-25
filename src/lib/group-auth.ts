import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { RateLimiter, verifyPassword, signToken, verifyToken, isTokenExpired, cookieOptions } from './auth-common';
import { isAdmin } from './identity';

const COOKIE_NAME = 'group-session';
const rateLimiter = new RateLimiter();

// Add a slug here when introducing a new group (also set CO_<SLUG>_PASSWORD).
const ALLOWED_GROUPS = ['snu'] as const;
type AllowedGroup = (typeof ALLOWED_GROUPS)[number];

function isAllowedGroup(group: string): group is AllowedGroup {
  return (ALLOWED_GROUPS as readonly string[]).includes(group);
}

function envKeyFor(group: AllowedGroup): string {
  return `CO_${group.toUpperCase().replace(/-/g, '_')}_PASSWORD`;
}

export function checkGroupRateLimit(ip: string): boolean {
  return rateLimiter.check(ip);
}

export function verifyGroupPassword(group: string, input: string): boolean {
  if (!isAllowedGroup(group)) return false;
  return verifyPassword(input, process.env[envKeyFor(group)]);
}

export function isGroupConfigured(group: string): boolean {
  if (!isAllowedGroup(group)) return false;
  return !!process.env[envKeyFor(group)]?.trim();
}

export function signGroupToken(group: string): string {
  return signToken(`group:${group}:${Date.now()}`);
}

export function verifyGroupToken(token: string): string | null {
  const result = verifyToken(token);
  if (!result) return null;
  const match = result.payload.match(/^group:([^:]+):(\d+)$/);
  if (!match) return null;
  if (isTokenExpired(Number(match[2]))) return null;
  return match[1];
}

export function getGroupFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyGroupToken(token) : null;
}

export async function getAuthenticatedGroup(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verifyGroupToken(token) : null;
}

export async function isAdminSession(): Promise<boolean> {
  return isAdmin();
}

export async function canAccessGroup(targetGroup: string): Promise<boolean> {
  if (await isAdmin()) return true;
  const sessionGroup = await getAuthenticatedGroup();
  return sessionGroup === targetGroup;
}

export function groupCookieOptions(token: string) {
  return cookieOptions(COOKIE_NAME, token);
}

export function deleteGroupCookieOptions() {
  return cookieOptions(COOKIE_NAME, '', 0);
}
