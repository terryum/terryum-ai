import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/identity';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['visible', 'hidden', 'spam']);

/* PATCH — admin-only: update comment status (visible | hidden | spam). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { slug, id } = await params;
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const status = typeof body.status === 'string' ? body.status : '';
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('post_comments')
    .update({ status })
    .eq('id', id)
    .eq('post_slug', slug);
  if (error) return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/* DELETE — admin-only: hard delete. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { slug, id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('post_comments').delete().eq('id', id).eq('post_slug', slug);
  if (error) return NextResponse.json({ error: 'DB error', detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
