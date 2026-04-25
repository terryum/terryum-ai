import { NextResponse } from 'next/server';
import { getPublicSupabaseClient } from '@/lib/supabase-public';
import { getPostsByType } from '@/lib/posts';

export const runtime = 'nodejs';

interface GraphPaper {
  slug: string;
  title_en: string;
  title_ko: string;
  domain: string | null;
  taxonomy_primary: string | null;
  meta_json: Record<string, unknown> | null;
}

interface GraphEdge {
  edge_id: string;
  source_slug: string;
  target_slug: string;
  edge_type: string;
}

interface GraphLayout {
  slug: string;
  x: number;
  y: number;
}

interface GraphPayload {
  papers: GraphPaper[];
  edges: GraphEdge[];
  layouts: GraphLayout[];
}

function buildFallbackEdges(papers: GraphPaper[]): GraphEdge[] {
  const validSlugs = new Set(papers.map((paper) => paper.slug));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];

  for (const paper of papers) {
    const relations = paper.meta_json?.relations;
    if (!Array.isArray(relations)) continue;

    for (const relation of relations) {
      if (!relation || typeof relation !== 'object') continue;

      const target = 'target' in relation && typeof relation.target === 'string'
        ? relation.target
        : null;
      const edgeType = 'type' in relation && typeof relation.type === 'string'
        ? relation.type
        : 'related';

      if (!target || !validSlugs.has(target)) continue;

      const edgeId = `${paper.slug}__${target}__${edgeType}`;
      if (seen.has(edgeId)) continue;

      seen.add(edgeId);
      edges.push({
        edge_id: edgeId,
        source_slug: paper.slug,
        target_slug: target,
        edge_type: edgeType,
      });
    }
  }

  return edges;
}

async function loadFallbackGraphData(): Promise<GraphPayload> {
  const [enPosts, koPosts] = await Promise.all([
    getPostsByType('en', 'papers'),
    getPostsByType('ko', 'papers'),
  ]);

  const enBySlug = new Map(enPosts.map((post) => [post.slug, post]));
  const koBySlug = new Map(koPosts.map((post) => [post.slug, post]));
  const slugs = Array.from(new Set([...enBySlug.keys(), ...koBySlug.keys()])).sort();

  const papers: GraphPaper[] = slugs.map((slug) => {
    const enPost = enBySlug.get(slug);
    const koPost = koBySlug.get(slug);
    const base = enPost ?? koPost;

    return {
      slug,
      title_en: enPost?.title ?? koPost?.title ?? slug,
      title_ko: koPost?.title ?? enPost?.title ?? slug,
      domain: base?.domain ?? null,
      taxonomy_primary: base?.taxonomy_primary ?? null,
      meta_json: (base as Record<string, unknown> | undefined) ?? null,
    };
  });

  return {
    papers,
    edges: buildFallbackEdges(papers),
    layouts: [],
  };
}

async function loadSupabaseGraphData(): Promise<GraphPayload | null> {
  const supabase = getPublicSupabaseClient();
  if (!supabase) {
    console.warn('[paper-map] Supabase runtime env missing, using filesystem fallback');
    return null;
  }

  try {
    const [papersRes, edgesRes, layoutsRes] = await Promise.all([
      supabase
        .from('papers')
        .select('slug,title_en,title_ko,domain,taxonomy_primary,taxonomy_secondary,key_concepts,source_author,published_at,meta_json')
        .order('slug'),
      supabase
        .from('graph_edges')
        .select('edge_id,source_slug,target_slug,edge_type,status')
        .eq('status', 'confirmed'),
      supabase
        .from('node_layouts')
        .select('slug,x,y')
        .eq('view_id', 'default'),
    ]);

    if (papersRes.error || edgesRes.error || layoutsRes.error) {
      console.warn(
        '[paper-map] Supabase query failed, using filesystem fallback',
        papersRes.error?.message || edgesRes.error?.message || layoutsRes.error?.message
      );
      return null;
    }

    return {
      papers: papersRes.data,
      edges: edgesRes.data,
      layouts: layoutsRes.data,
    };
  } catch (error) {
    console.warn('[paper-map] Supabase request crashed, using filesystem fallback', error);
    return null;
  }
}

export async function GET() {
  try {
    const supabaseData = await loadSupabaseGraphData();
    const data = supabaseData ?? await loadFallbackGraphData();

    return NextResponse.json(
      data,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          'X-Paper-Map-Source': supabaseData ? 'supabase' : 'filesystem',
        },
      }
    );
  } catch (error) {
    console.error('[paper-map] Failed to build graph payload', error);
    return NextResponse.json({ error: 'Failed to load graph data' }, { status: 500 });
  }
}
