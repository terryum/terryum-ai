'use client';

import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { PaperRow, GraphEdgeRow, NodeLayoutRow } from './graph-types';

// Taxonomy → color mapping
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

const STATUS_STYLES: Record<string, { stroke: string; strokeDasharray?: string }> = {
  confirmed: { stroke: '#6366f1' },
  suggested: { stroke: '#94a3b8', strokeDasharray: '5 5' },
  rejected: { stroke: '#ef4444', strokeDasharray: '3 3' },
};

interface GraphCanvasProps {
  papers: PaperRow[];
  edges: GraphEdgeRow[];
  layouts: NodeLayoutRow[];
  selectedPaper: string | null;
  selectedEdge: string | null;
  statusFilter: string | null;
  onSelectPaper: (slug: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onNodesPositionChange: (positions: { slug: string; x: number; y: number }[]) => void;
}

function buildNodes(papers: PaperRow[], layouts: NodeLayoutRow[], selectedPaper: string | null): Node[] {
  const layoutMap = new Map(layouts.map(l => [l.slug, l]));

  return papers.map((p, i) => {
    const layout = layoutMap.get(p.slug);
    const color = TAXONOMY_COLORS[p.taxonomy_primary ?? ''] ?? '#64748b';
    const isSelected = p.slug === selectedPaper;

    return {
      id: p.slug,
      position: {
        x: layout?.x ?? 100 + (i % 5) * 250,
        y: layout?.y ?? 100 + Math.floor(i / 5) * 150,
      },
      data: {
        label: p.slug.length > 25 ? p.slug.slice(0, 22) + '...' : p.slug,
      },
      style: {
        background: isSelected ? color : `${color}22`,
        color: isSelected ? '#fff' : color,
        border: `2px solid ${color}`,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        fontWeight: isSelected ? 700 : 500,
        minWidth: '120px',
        textAlign: 'center' as const,
      },
    };
  });
}

function buildEdges(graphEdges: GraphEdgeRow[], statusFilter: string | null, selectedEdge: string | null): Edge[] {
  return graphEdges
    .filter(e => !statusFilter || e.status === statusFilter)
    .map(e => {
      const style = STATUS_STYLES[e.status] ?? STATUS_STYLES.suggested;
      const isSelected = e.edge_id === selectedEdge;

      return {
        id: e.edge_id,
        source: e.source_slug,
        target: e.target_slug,
        label: e.edge_type,
        type: 'default',
        animated: e.status === 'suggested',
        style: {
          stroke: isSelected ? '#f59e0b' : style.stroke,
          strokeWidth: isSelected ? 3 : 1.5,
          strokeDasharray: style.strokeDasharray,
        },
        labelStyle: {
          fontSize: '10px',
          fill: '#94a3b8',
        },
      };
    });
}

export default function GraphCanvas({
  papers,
  edges: graphEdges,
  layouts,
  selectedPaper,
  selectedEdge,
  statusFilter,
  onSelectPaper,
  onSelectEdge,
  onNodesPositionChange,
}: GraphCanvasProps) {
  const initialNodes = useMemo(
    () => buildNodes(papers, layouts, selectedPaper),
    [papers, layouts, selectedPaper]
  );

  const initialEdges = useMemo(
    () => buildEdges(graphEdges, statusFilter, selectedEdge),
    [graphEdges, statusFilter, selectedEdge]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, , onEdgesChange] = useEdgesState(initialEdges);

  // Sync when props change
  useMemo(() => {
    setNodes(buildNodes(papers, layouts, selectedPaper));
  }, [papers, layouts, selectedPaper, setNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => onSelectPaper(node.id),
    [onSelectPaper]
  );

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => onSelectEdge(edge.id),
    [onSelectEdge]
  );

  const handlePaneClick = useCallback(() => {
    onSelectPaper(null);
    onSelectEdge(null);
  }, [onSelectPaper, onSelectEdge]);

  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      // Track position changes for save
      const posChanges = changes
        .filter((c): c is { type: 'position'; id: string; position?: { x: number; y: number }; dragging?: boolean } =>
          c.type === 'position' && 'dragging' in c && c.dragging === false
        )
        .map(c => ({ slug: c.id, x: c.position?.x ?? 0, y: c.position?.y ?? 0 }));

      if (posChanges.length > 0) {
        onNodesPositionChange(posChanges);
      }
    },
    [onNodesChange, onNodesPositionChange]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          pannable
          zoomable
          style={{ background: '#1e293b' }}
        />
      </ReactFlow>
    </div>
  );
}
