import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabaseClient } from '@/lib/supabase-public';

export const runtime = 'nodejs';

const GRAPH_DECAY = 0.5;

interface SearchResult {
  slug: string;
  title_ko: string;
  title_en: string;
  domain: string | null;
  taxonomy_primary: string | null;
  rank: number;
  source: 'fts' | 'graph';
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q')?.trim();
  const lang = searchParams.get('lang') || 'ko';
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 30);

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const supabase = getPublicSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Search not configured', fallback: true },
      { status: 503 }
    );
  }

  try {

    // 1. Full-text search via Supabase RPC
    const { data: ftsResults, error: rpcError } = await supabase.rpc('search_posts_fts', {
      search_query: query,
      search_lang: lang === 'en' ? 'en' : 'ko',
      match_count: 20,
    });

    if (rpcError) {
      throw new Error(`Supabase RPC error: ${rpcError.message}`);
    }

    const results = new Map<string, SearchResult>();
    for (const r of ftsResults || []) {
      results.set(r.slug, {
        slug: r.slug,
        title_ko: r.title_ko,
        title_en: r.title_en,
        domain: r.domain,
        taxonomy_primary: r.taxonomy_primary,
        rank: r.rank,
        source: 'fts',
      });
    }

    // 2. Graph expansion: 1-hop neighbors of FTS results
    const ftsSlugs = Array.from(results.keys());
    if (ftsSlugs.length > 0) {
      const { data: edges } = await supabase
        .from('graph_edges')
        .select('source_slug, target_slug, weight, edge_type')
        .or(
          `source_slug.in.(${ftsSlugs.map(s => `"${s}"`).join(',')}),` +
          `target_slug.in.(${ftsSlugs.map(s => `"${s}"`).join(',')})`
        )
        .eq('status', 'confirmed');

      if (edges) {
        const neighborSlugs = new Set<string>();

        for (const edge of edges) {
          const parentSlug = ftsSlugs.includes(edge.source_slug)
            ? edge.source_slug
            : edge.target_slug;
          const neighborSlug = edge.source_slug === parentSlug
            ? edge.target_slug
            : edge.source_slug;

          const parentScore = results.get(parentSlug)?.rank || 0;
          const neighborScore = parentScore * (edge.weight || 0.5) * GRAPH_DECAY;

          if (!results.has(neighborSlug)) {
            neighborSlugs.add(neighborSlug);
            results.set(neighborSlug, {
              slug: neighborSlug,
              title_ko: '',
              title_en: '',
              domain: null,
              taxonomy_primary: null,
              rank: neighborScore,
              source: 'graph',
            });
          } else {
            const existing = results.get(neighborSlug)!;
            if (neighborScore > existing.rank) {
              existing.rank = neighborScore;
            }
          }
        }

        // Fetch metadata for graph-expanded neighbors
        if (neighborSlugs.size > 0) {
          const { data: neighborPapers } = await supabase
            .from('papers')
            .select('slug, title_ko, title_en, domain, taxonomy_primary')
            .in('slug', Array.from(neighborSlugs));

          if (neighborPapers) {
            for (const p of neighborPapers) {
              const existing = results.get(p.slug);
              if (existing) {
                existing.title_ko = p.title_ko;
                existing.title_en = p.title_en;
                existing.domain = p.domain;
                existing.taxonomy_primary = p.taxonomy_primary;
              }
            }
          }
        }
      }
    }

    // 3. Sort by rank and return
    const sorted = Array.from(results.values())
      .sort((a, b) => b.rank - a.rank)
      .slice(0, limit);

    return NextResponse.json(
      { results: sorted },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json(
      { error: 'Search failed', fallback: true },
      { status: 503 }
    );
  }
}
