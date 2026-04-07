import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGroupFromRequest } from '@/lib/group-auth';
import { isAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

function getSupabaseRuntime() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key };
}

/** GET /api/co/content/[slug]?group=snu — Get a single private content item */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const group = request.nextUrl.searchParams.get('group');

  if (!group) {
    return NextResponse.json({ error: 'group parameter is required' }, { status: 400 });
  }

  const isAdmin = isAdminRequest(request);
  const sessionGroup = getGroupFromRequest(request);

  if (!isAdmin && sessionGroup !== group) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url, key } = getSupabaseRuntime();
  if (!url || !key) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('private_content')
    .select('*')
    .eq('slug', slug)
    .eq('group_slug', group)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  return NextResponse.json({ content: data });
}
