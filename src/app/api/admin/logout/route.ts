import { NextResponse } from 'next/server';
import { deleteCookieOptions } from '@/lib/admin-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(deleteCookieOptions());
  return response;
}
