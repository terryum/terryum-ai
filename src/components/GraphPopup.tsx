'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const KnowledgeGraph = dynamic(() => import('./KnowledgeGraph'), { ssr: false });

interface GraphPopupProps {
  open: boolean;
  onClose: () => void;
  locale: string;
}

interface GraphData {
  papers: Array<{ slug: string; title_en: string; title_ko: string; domain: string | null; taxonomy_primary: string | null; meta_json: Record<string, unknown> | null }>;
  edges: Array<{ edge_id: string; source_slug: string; target_slug: string; edge_type: string }>;
  layouts: Array<{ slug: string; x: number; y: number }>;
}

export default function GraphPopup({ open, onClose, locale }: GraphPopupProps) {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/public/graph');
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const detail =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? `: ${payload.error}`
            : '';
        throw new Error(`HTTP ${res.status}${detail}`);
      }
      setData(payload as GraphData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !data) fetchData();
  }, [open, data, fetchData]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-[95vw] h-[90vh] max-w-7xl bg-bg-primary rounded-xl shadow-2xl border border-line-default overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-bg-primary/90 backdrop-blur-sm border-b border-line-default">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-text-primary">
              {locale === 'ko' ? '지식 그래프' : 'Knowledge Graph'}
            </h2>
            {data && (
              <span className="text-xs text-text-muted">
                {data.papers.length} {locale === 'ko' ? '노드' : 'nodes'} · {data.edges.length} {locale === 'ko' ? '연결' : 'edges'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden sm:flex items-center gap-2 text-[10px] text-text-muted">
              <span className="inline-block w-3 h-3 rounded border-2 border-blue-500 bg-blue-500/10" /> Papers
              <span className="inline-block w-3 h-3 rounded-full border-2 border-dashed border-violet-500 bg-violet-500/10" /> Essays/Memos
            </div>
            <button
              onClick={onClose}
              className="p-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Graph area */}
        <div className="w-full h-full pt-10">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">
              {error}
            </div>
          )}
          {data && !loading && (
            <KnowledgeGraph
              papers={data.papers}
              edges={data.edges}
              layouts={data.layouts}
              locale={locale}
            />
          )}
        </div>
      </div>
    </div>
  );
}
