import { NextResponse } from 'next/server';
import { getSupabaseBrowser, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const supabase = getSupabaseBrowser();

  const [papersRes, edgesRes, layoutsRes] = await Promise.all([
    supabase.from('papers').select('slug,title_en,title_ko,domain,taxonomy_primary,taxonomy_secondary,key_concepts,source_author,published_at,meta_json').order('slug'),
    supabase.from('graph_edges').select('edge_id,source_slug,target_slug,edge_type,status').eq('status', 'confirmed'),
    supabase.from('node_layouts').select('slug,x,y').eq('view_id', 'default'),
  ]);

  if (papersRes.error || edgesRes.error || layoutsRes.error) {
    return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
  }

  return NextResponse.json(
    { papers: papersRes.data, edges: edgesRes.data, layouts: layoutsRes.data },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}
