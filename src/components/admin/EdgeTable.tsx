'use client';

import { EDGE_TYPES, type GraphEdgeRow, type EdgeAction } from './graph-types';

interface EdgeTableProps {
  edges: GraphEdgeRow[];
  selectedEdge: string | null;
  onAction: (edgeId: string, action: EdgeAction) => void;
  onTypeChange: (edgeId: string, newType: string) => void;
  onSelectEdge: (edgeId: string | null) => void;
}

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suggested: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function EdgeTable({
  edges,
  selectedEdge,
  onAction,
  onTypeChange,
  onSelectEdge,
}: EdgeTableProps) {
  if (edges.length === 0) {
    return <p className="text-sm text-text-muted text-center py-4">No edges</p>;
  }

  return (
    <div className="overflow-x-auto border border-line-default rounded-md">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-line-default bg-bg-secondary">
            <th className="text-left px-2 py-1.5 text-text-secondary font-medium">Source</th>
            <th className="text-left px-2 py-1.5 text-text-secondary font-medium">Target</th>
            <th className="text-left px-2 py-1.5 text-text-secondary font-medium">Type</th>
            <th className="text-left px-2 py-1.5 text-text-secondary font-medium">Prov.</th>
            <th className="text-center px-2 py-1.5 text-text-secondary font-medium">Status</th>
            <th className="text-right px-2 py-1.5 text-text-secondary font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {edges.map(e => (
            <tr
              key={e.edge_id}
              className={`border-b border-line-default last:border-b-0 cursor-pointer transition-colors ${
                selectedEdge === e.edge_id ? 'bg-accent/5' : 'hover:bg-bg-secondary'
              }`}
              onClick={() => onSelectEdge(e.edge_id)}
            >
              <td className="px-2 py-1.5 text-text-primary truncate max-w-[120px]">{e.source_slug}</td>
              <td className="px-2 py-1.5 text-text-primary truncate max-w-[120px]">{e.target_slug}</td>
              <td className="px-2 py-1.5">
                <select
                  value={e.edge_type}
                  onChange={(ev) => {
                    ev.stopPropagation();
                    onTypeChange(e.edge_id, ev.target.value);
                  }}
                  className="bg-transparent text-text-secondary text-xs border border-line-default rounded px-1 py-0.5"
                >
                  {EDGE_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1.5 text-text-muted">{e.provenance}</td>
              <td className="px-2 py-1.5 text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_BADGE[e.status] ?? ''}`}>
                  {e.status}
                </span>
              </td>
              <td className="px-2 py-1.5 text-right">
                <div className="flex gap-1 justify-end" onClick={(ev) => ev.stopPropagation()}>
                  {e.status !== 'confirmed' && (
                    <button
                      onClick={() => onAction(e.edge_id, 'approve')}
                      className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                      title="Approve"
                    >
                      OK
                    </button>
                  )}
                  {e.status !== 'rejected' && (
                    <button
                      onClick={() => onAction(e.edge_id, 'reject')}
                      className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                      title="Reject"
                    >
                      No
                    </button>
                  )}
                  <button
                    onClick={() => onAction(e.edge_id, 'delete')}
                    className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
                    title="Delete"
                  >
                    Del
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
