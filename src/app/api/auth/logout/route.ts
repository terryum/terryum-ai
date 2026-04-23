import { NextResponse } from 'next/server';
import { deleteIdentityCookieOptions } from '@/lib/identity';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(deleteIdentityCookieOptions());
  return response;
}
