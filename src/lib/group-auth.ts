import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { RateLimiter, verifyPassword, signToken, verifyToken, isTokenExpired, cookieOptions } from './auth-common';
import { isAdmin } from './identity';

const COOKIE_NAME = 'group-session';
const rateLimiter = new RateLimiter();

export function checkGroupRateLimit(ip: string): boolean {
  return rateLimiter.check(ip);
}

export function verifyGroupPassword(group: string, input: string): boolean {
  const envKey = `CO_${group.toUpperCase().replace(/-/g, '_')}_PASSWORD`;
  return verifyPassword(input, process.env[envKey]);
}

export function isGroupConfigured(group: string): boolean {
  const envKey = `CO_${group.toUpperCase().replace(/-/g, '_')}_PASSWORD`;
  return !!process.env[envKey]?.trim();
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
