import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/identity';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

/* GET — admin-only: list recent comments across all posts (incl. hidden/spam). */
export async function GET(request: NextRequest) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get('status');
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('post_comments')
    .select('id, post_slug, author_name, author_email, content, status, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status && ['visible', 'hidden', 'spam'].includes(status)) {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ comments: data ?? [] });
}
