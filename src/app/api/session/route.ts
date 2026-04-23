import { NextResponse } from 'next/server';
import { getAuthenticatedGroup } from '@/lib/group-auth';
import { isAdmin } from '@/lib/identity';

export async function GET() {
  const [group, admin] = await Promise.all([
    getAuthenticatedGroup(),
    isAdmin(),
  ]);
  const sessionLabel = admin ? 'Admin' : group ? group.toUpperCase() : null;
  return NextResponse.json({ sessionLabel });
}
