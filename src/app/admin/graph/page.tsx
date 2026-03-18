'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import EdgeTable from '@/components/admin/EdgeTable';
import PaperDetailPanel from '@/components/admin/PaperDetailPanel';
import AddEdgeForm from '@/components/admin/AddEdgeForm';
import type { PaperRow, GraphEdgeRow, NodeLayoutRow, EdgeAction } from '@/components/admin/graph-types';

const GraphCanvas = dynamic(() => import('@/components/admin/GraphCanvas'), {
  ssr: false,
  loading: () => <div className="w-full h-[500px] bg-bg-secondary rounded-md animate-pulse" />,
});

type StatusFilter = 'all' | 'suggested' | 'confirmed' | 'rejected';

interface GraphData {
  papers: PaperRow[];
  edges: GraphEdgeRow[];
  layouts: NodeLayoutRow[];
}

export default function GraphPage() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Track unsaved layout changes
  const pendingPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/graph');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleEdgeAction = useCallback(async (edgeId: string, action: EdgeAction) => {
    try {
      const res = await fetch('/api/admin/graph/edges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edge_id: edgeId, action }),
      });
      if (!res.ok) throw new Error('Failed');
      await fetchData();
    } catch {
      setError('Edge action failed');
    }
  }, [fetchData]);

  const handleEdgeTypeChange = useCallback(async (edgeId: string, newType: string) => {
    try {
      const res = await fetch('/api/admin/graph/edges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edge_id: edgeId, edge_type: newType }),
      });
      if (!res.ok) throw new Error('Failed');
      await fetchData();
    } catch {
      setError('Type change failed');
    }
  }, [fetchData]);

  const handleAddEdge = useCallback(async (source: string, target: string, type: string, detail: string) => {
    try {
      const res = await fetch('/api/admin/graph/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_slug: source, target_slug: target, edge_type: type, detail: detail || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      await fetchData();
    } catch {
      setError('Add edge failed');
    }
  }, [fetchData]);

  const handleNodesPositionChange = useCallback((positions: { slug: string; x: number; y: number }[]) => {
    for (const p of positions) {
      pendingPositions.current.set(p.slug, { x: p.x, y: p.y });
    }
  }, []);

  const handleSaveLayout = useCallback(async () => {
    const nodes = Array.from(pendingPositions.current.entries()).map(([slug, pos]) => ({
      slug,
      x: pos.x,
      y: pos.y,
      pinned: true,
    }));

    if (nodes.length === 0) return;

    try {
      const res = await fetch('/api/admin/graph/layouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      });
      if (!res.ok) throw new Error('Failed');
      pendingPositions.current.clear();
      await fetchData();
    } catch {
      setError('Layout save failed');
    }
  }, [fetchData]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setError('');
    try {
      // Trigger sync via local script is not possible from browser.
      // Instead, show instruction.
      setError('Run `npm run sync-papers` in terminal to sync, then refresh.');
    } finally {
      setSyncing(false);
    }
  }, []);

  const selectedPaperData = data?.papers.find(p => p.slug === selectedPaper);

  const filteredEdges = data?.edges.filter(e =>
    statusFilter === 'all' || e.status === statusFilter
  ) ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-medium text-text-primary">Paper Graph</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['all', 'suggested', 'confirmed', 'rejected'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  statusFilter === s
                    ? 'bg-accent text-white'
                    : 'text-text-secondary hover:text-accent border border-line-default'
                }`}
              >
                {s === 'all' ? 'All' : s}
                {s !== 'all' && data && (
                  <span className="ml-1 opacity-70">
                    ({data.edges.filter(e => e.status === s).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-1 text-xs rounded border border-line-default text-text-secondary hover:text-accent transition-colors disabled:opacity-50"
          >
            Sync
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {loading ? (
        <div className="w-full h-[500px] bg-bg-secondary rounded-md animate-pulse" />
      ) : data ? (
        <>
          {/* Canvas + Detail Panel */}
          <div className="flex gap-4" style={{ height: '500px' }}>
            <div className="flex-1 border border-line-default rounded-md overflow-hidden">
              <GraphCanvas
                papers={data.papers}
                edges={data.edges}
                layouts={data.layouts}
                selectedPaper={selectedPaper}
                selectedEdge={selectedEdge}
                statusFilter={statusFilter === 'all' ? null : statusFilter}
                onSelectPaper={setSelectedPaper}
                onSelectEdge={setSelectedEdge}
                onNodesPositionChange={handleNodesPositionChange}
              />
            </div>

            {/* Right panel */}
            <div className="w-72 shrink-0 border border-line-default rounded-md p-3 overflow-y-auto">
              {selectedPaperData ? (
                <PaperDetailPanel
                  paper={selectedPaperData}
                  edges={data.edges}
                  onSelectEdge={setSelectedEdge}
                />
              ) : (
                <div className="text-sm text-text-muted text-center py-8">
                  Click a node to view details
                </div>
              )}
            </div>
          </div>

          {/* Edge Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-text-primary">
                Edges ({filteredEdges.length})
              </h2>
            </div>
            <EdgeTable
              edges={filteredEdges}
              selectedEdge={selectedEdge}
              onAction={handleEdgeAction}
              onTypeChange={handleEdgeTypeChange}
              onSelectEdge={setSelectedEdge}
            />
          </div>

          {/* Bottom bar: Add Edge + Save Layout */}
          <div className="flex items-end justify-between gap-4 flex-wrap border-t border-line-default pt-4">
            <div className="flex-1 min-w-[300px]">
              <h3 className="text-xs text-text-muted mb-2">Add Manual Edge</h3>
              <AddEdgeForm papers={data.papers} onAdd={handleAddEdge} />
            </div>
            <button
              onClick={handleSaveLayout}
              className="px-4 py-1.5 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors shrink-0"
            >
              Save Layout
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
