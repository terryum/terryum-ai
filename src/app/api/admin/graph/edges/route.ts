import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/identity';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { source_slug, target_slug, edge_type, detail } = body;

  if (!source_slug || !target_slug || !edge_type) {
    return NextResponse.json({ error: 'source_slug, target_slug, and edge_type are required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const edge_id = `${source_slug}__${target_slug}__${edge_type}`;

  const { data, error } = await supabase
    .from('graph_edges')
    .upsert({
      edge_id,
      source_slug,
      target_slug,
      edge_type,
      provenance: 'manual',
      status: 'confirmed',
      weight: 0.7,
      detail: detail || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'edge_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.json();
  const { edge_id, action, edge_type } = body;

  if (!edge_id) {
    return NextResponse.json({ error: 'edge_id is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (action === 'delete') {
    const { error } = await supabase
      .from('graph_edges')
      .delete()
      .eq('edge_id', edge_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: edge_id });
  }

  const updates: Record<string, string> = { updated_at: new Date().toISOString() };

  if (action === 'approve') updates.status = 'confirmed';
  else if (action === 'reject') updates.status = 'rejected';

  if (edge_type) updates.edge_type = edge_type;

  const { data, error } = await supabase
    .from('graph_edges')
    .update(updates)
    .eq('edge_id', edge_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
