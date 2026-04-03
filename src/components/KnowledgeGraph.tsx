'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';

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

interface KnowledgeGraphProps {
  papers: GraphPaper[];
  edges: GraphEdge[];
  layouts: GraphLayout[];
  locale: string;
}

const TAXONOMY_COLORS: Record<string, string> = {
  'robotics/brain': '#3b82f6',
  'robotics/arm': '#10b981',
  'robotics/hand': '#f59e0b',
  'robotics/leg': '#ef4444',
  robotics: '#6366f1',
  'ai/llm': '#8b5cf6',
  'ai/rl': '#ec4899',
  'ai/agent': '#14b8a6',
  ai: '#a855f7',
};

function getNodeColor(taxonomy: string | null): string {
  if (!taxonomy) return '#64748b';
  for (const [prefix, color] of Object.entries(TAXONOMY_COLORS)) {
    if (taxonomy.startsWith(prefix)) return color;
  }
  return '#64748b';
}

function getContentType(paper: GraphPaper): string {
  const meta = paper.meta_json as Record<string, string> | null;
  return meta?.content_type ?? 'papers';
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export default function KnowledgeGraph({ papers, edges, layouts, locale }: KnowledgeGraphProps) {
  const router = useRouter();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Pre-compute neighbor sets for hover highlighting
  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source_slug)) map.set(e.source_slug, new Set());
      if (!map.has(e.target_slug)) map.set(e.target_slug, new Set());
      map.get(e.source_slug)!.add(e.target_slug);
      map.get(e.target_slug)!.add(e.source_slug);
    }
    return map;
  }, [edges]);

  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return null;
    const set = new Set<string>();
    for (const e of edges) {
      if (e.source_slug === hoveredNode || e.target_slug === hoveredNode) {
        set.add(e.edge_id);
      }
    }
    return set;
  }, [edges, hoveredNode]);

  const isHighlighted = useCallback(
    (slug: string) => {
      if (!hoveredNode) return true;
      if (slug === hoveredNode) return true;
      return neighborMap.get(hoveredNode)?.has(slug) ?? false;
    },
    [hoveredNode, neighborMap]
  );

  const layoutMap = useMemo(() => new Map(layouts.map(l => [l.slug, l])), [layouts]);

  const initialNodes: Node[] = useMemo(() => {
    return papers.map((p, i) => {
      const layout = layoutMap.get(p.slug);
      const color = getNodeColor(p.taxonomy_primary);
      const contentType = getContentType(p);
      const title = locale === 'ko' ? p.title_ko : p.title_en;
      const highlighted = isHighlighted(p.slug);

      // Different shape indicators for content types
      const borderStyle = contentType === 'papers' ? 'solid' : 'dashed';

      return {
        id: p.slug,
        position: {
          x: layout?.x ?? 100 + (i % 6) * 220,
          y: layout?.y ?? 100 + Math.floor(i / 6) * 140,
        },
        data: { label: truncate(title, 28) },
        style: {
          background: highlighted ? `${color}22` : `${color}08`,
          color: highlighted ? color : `${color}44`,
          border: `2px ${borderStyle} ${highlighted ? color : `${color}33`}`,
          borderRadius: contentType === 'papers' ? '8px' : '16px',
          padding: '6px 10px',
          fontSize: '11px',
          fontWeight: 500,
          minWidth: '100px',
          textAlign: 'center' as const,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          opacity: highlighted ? 1 : 0.3,
        },
      };
    });
  }, [papers, layoutMap, locale, isHighlighted]);

  const initialEdges: Edge[] = useMemo(() => {
    return edges.map(e => {
      const highlighted = !hoveredNode || connectedEdges?.has(e.edge_id);
      return {
        id: e.edge_id,
        source: e.source_slug,
        target: e.target_slug,
        type: 'default',
        style: {
          stroke: highlighted ? '#6366f1' : '#6366f122',
          strokeWidth: highlighted ? 1.5 : 0.5,
          transition: 'all 0.2s ease',
        },
        labelStyle: {
          fontSize: '9px',
          fill: highlighted ? '#94a3b8' : 'transparent',
        },
      };
    });
  }, [edges, hoveredNode, connectedEdges]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(initialEdges);

  // Keep nodes/edges in sync with hover state
  useMemo(() => {
    // This triggers re-render via initialNodes/initialEdges dependency
  }, [initialNodes, initialEdges]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const paper = papers.find(p => p.slug === node.id);
      if (!paper) return;
      const contentType = getContentType(paper);
      const basePath = contentType === 'papers' ? 'research' : contentType;
      router.push(`/${locale}/${basePath}/${node.id}`);
    },
    [papers, locale, router]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={(_, node) => setHoveredNode(node.id)}
        onNodeMouseLeave={() => setHoveredNode(null)}
        onPaneClick={() => setHoveredNode(null)}
        fitView
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          style={{ background: '#0f172a' }}
        />
      </ReactFlow>
    </div>
  );
}
