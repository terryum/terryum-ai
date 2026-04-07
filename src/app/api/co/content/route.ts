import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getGroupFromRequest } from '@/lib/group-auth';
import { isAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

function getSupabaseRuntime() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  return { url, key };
}

/** GET /api/co/content?group=snu — List published private content for a group */
export async function GET(request: NextRequest) {
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
    .select('slug, content_type, title_ko, title_en, cover_image_url, status, created_at, updated_at')
    .eq('group_slug', group)
    .eq('status', 'published')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}
