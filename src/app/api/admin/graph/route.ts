import { NextRequest, NextResponse } from 'next/server';
import { isAdminFromRequest } from '@/lib/identity';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  if (!isAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const paperFilter = searchParams.get('paper');

  const [papersRes, edgesRes, layoutsRes] = await Promise.all([
    supabase.from('papers').select('*').order('slug'),
    (() => {
      let query = supabase.from('graph_edges').select('*');
      if (statusFilter) query = query.eq('status', statusFilter);
      if (paperFilter) {
        query = query.or(`source_slug.eq.${paperFilter},target_slug.eq.${paperFilter}`);
      }
      return query.order('created_at', { ascending: false });
    })(),
    supabase.from('node_layouts').select('*').eq('view_id', 'default'),
  ]);

  if (papersRes.error || edgesRes.error || layoutsRes.error) {
    return NextResponse.json(
      { error: 'Database query failed', details: papersRes.error?.message || edgesRes.error?.message || layoutsRes.error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    papers: papersRes.data,
    edges: edgesRes.data,
    layouts: layoutsRes.data,
  });
}
