import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, signSessionToken, sessionCookieOptions } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { password } = body;

  if (!password || !verifyPassword(password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = signSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieOptions(token));
  return response;
}
