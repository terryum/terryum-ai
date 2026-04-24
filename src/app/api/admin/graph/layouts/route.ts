import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/identity';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { nodes } = body;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return NextResponse.json({ error: 'nodes array is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const rows = nodes.map((n: { slug: string; x: number; y: number; pinned?: boolean }) => ({
    slug: n.slug,
    view_id: 'default',
    x: n.x,
    y: n.y,
    pinned: n.pinned ?? false,
  }));

  const { error } = await supabase
    .from('node_layouts')
    .upsert(rows, { onConflict: 'slug,view_id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: rows.length });
}
