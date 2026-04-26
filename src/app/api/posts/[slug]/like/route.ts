import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { readAnonId, issueAnonId, setAnonCookie } from '@/lib/anon-id';
import { isKnownSlug } from '@/lib/post-validation';

export const runtime = 'nodejs';

/* GET — like count + whether the current anon_id has liked the slug. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isKnownSlug(slug)) {
    return NextResponse.json({ error: 'Unknown post' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const anonId = readAnonId(request);

  const countRes = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_slug', slug);
  if (countRes.error) {
    return NextResponse.json({ error: 'DB error', detail: countRes.error.message }, { status: 500 });
  }

  let liked = false;
  if (anonId) {
    const likedRes = await supabase
      .from('post_likes')
      .select('post_slug', { count: 'exact', head: true })
      .eq('post_slug', slug)
      .eq('anon_id', anonId);
    liked = (likedRes.count ?? 0) > 0;
  }

  return NextResponse.json({ count: countRes.count ?? 0, liked });
}

/* POST — toggle like for the requesting anon_id (issue cookie if missing). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isKnownSlug(slug)) {
    return NextResponse.json({ error: 'Unknown post' }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  let anonId = readAnonId(request);
  const issuedNew = !anonId;
  if (!anonId) anonId = issueAnonId();

  const existing = await supabase
    .from('post_likes')
    .select('post_slug')
    .eq('post_slug', slug)
    .eq('anon_id', anonId)
    .maybeSingle();
  if (existing.error) {
    return NextResponse.json({ error: 'DB error', detail: existing.error.message }, { status: 500 });
  }

  let liked: boolean;
  if (existing.data) {
    const del = await supabase
      .from('post_likes')
      .delete()
      .eq('post_slug', slug)
      .eq('anon_id', anonId);
    if (del.error) {
      return NextResponse.json({ error: 'DB error', detail: del.error.message }, { status: 500 });
    }
    liked = false;
  } else {
    const ins = await supabase.from('post_likes').insert({ post_slug: slug, anon_id: anonId });
    if (ins.error) {
      return NextResponse.json({ error: 'DB error', detail: ins.error.message }, { status: 500 });
    }
    liked = true;
  }

  const countRes = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_slug', slug);

  const response = NextResponse.json({ ok: true, liked, count: countRes.count ?? 0 });
  if (issuedNew) setAnonCookie(response, anonId);
  return response;
}
