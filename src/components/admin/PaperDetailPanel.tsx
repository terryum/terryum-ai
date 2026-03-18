'use client';

import type { PaperRow, GraphEdgeRow } from './graph-types';

interface PaperDetailPanelProps {
  paper: PaperRow;
  edges: GraphEdgeRow[];
  onSelectEdge: (edgeId: string) => void;
}

function Tag({ children }: { children: string }) {
  return (
    <span className="inline-block px-2 py-0.5 text-xs bg-bg-secondary rounded border border-line-default text-text-secondary">
      {children}
    </span>
  );
}

export default function PaperDetailPanel({ paper, edges, onSelectEdge }: PaperDetailPanelProps) {
  const relatedEdges = edges.filter(
    e => e.source_slug === paper.slug || e.target_slug === paper.slug
  );
  const aiSummary = (paper.meta_json as Record<string, unknown>)?.ai_summary as
    | { one_liner?: string }
    | undefined;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{paper.title_en}</h3>
        <p className="text-xs text-text-muted mt-0.5">{paper.title_ko}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-text-muted">Domain</span>
          <p className="text-text-secondary">{paper.domain ?? '—'}</p>
        </div>
        <div>
          <span className="text-text-muted">Type</span>
          <p className="text-text-secondary">{paper.contribution_type ?? '—'}</p>
        </div>
        <div>
          <span className="text-text-muted">Author</span>
          <p className="text-text-secondary truncate">{paper.source_author ?? '—'}</p>
        </div>
        <div>
          <span className="text-text-muted">Date</span>
          <p className="text-text-secondary">
            {paper.source_date ? new Date(paper.source_date).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      <div>
        <span className="text-xs text-text-muted">Taxonomy</span>
        <p className="text-xs text-text-secondary">
          {paper.taxonomy_primary ?? '—'}
          {paper.taxonomy_secondary?.length > 0 && (
            <span className="text-text-muted"> + {paper.taxonomy_secondary.join(', ')}</span>
          )}
        </p>
      </div>

      {paper.key_concepts.length > 0 && (
        <div>
          <span className="text-xs text-text-muted block mb-1">Key Concepts</span>
          <div className="flex flex-wrap gap-1">
            {paper.key_concepts.map(c => <Tag key={c}>{c}</Tag>)}
          </div>
        </div>
      )}

      {paper.methodology.length > 0 && (
        <div>
          <span className="text-xs text-text-muted block mb-1">Methodology</span>
          <div className="flex flex-wrap gap-1">
            {paper.methodology.map(m => <Tag key={m}>{m}</Tag>)}
          </div>
        </div>
      )}

      {aiSummary?.one_liner && (
        <div>
          <span className="text-xs text-text-muted block mb-1">Summary</span>
          <p className="text-xs text-text-secondary italic">{aiSummary.one_liner}</p>
        </div>
      )}

      {relatedEdges.length > 0 && (
        <div>
          <span className="text-xs text-text-muted block mb-1">Edges ({relatedEdges.length})</span>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {relatedEdges.map(e => {
              const other = e.source_slug === paper.slug ? e.target_slug : e.source_slug;
              const dir = e.source_slug === paper.slug ? '->' : '<-';
              return (
                <button
                  key={e.edge_id}
                  onClick={() => onSelectEdge(e.edge_id)}
                  className="w-full text-left text-xs px-2 py-1 rounded hover:bg-bg-secondary transition-colors flex items-center gap-1"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    e.status === 'confirmed' ? 'bg-green-400' :
                    e.status === 'rejected' ? 'bg-red-400' : 'bg-gray-400'
                  }`} />
                  <span className="text-text-muted">{dir}</span>
                  <span className="text-text-secondary truncate">{other}</span>
                  <span className="text-text-muted ml-auto shrink-0">{e.edge_type}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
