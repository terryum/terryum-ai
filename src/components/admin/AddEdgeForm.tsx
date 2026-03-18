'use client';

import { useState } from 'react';
import { EDGE_TYPES, type PaperRow } from './graph-types';

interface AddEdgeFormProps {
  papers: PaperRow[];
  onAdd: (source: string, target: string, type: string, detail: string) => void;
}

export default function AddEdgeForm({ papers, onAdd }: AddEdgeFormProps) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [type, setType] = useState<string>(EDGE_TYPES[0]);
  const [detail, setDetail] = useState('');

  const slugs = papers.map(p => p.slug).sort();
  const canSubmit = source && target && source !== target;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onAdd(source, target, type, detail);
    setSource('');
    setTarget('');
    setDetail('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[140px]">
        <label className="text-xs text-text-muted block mb-0.5">Source</label>
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full text-xs border border-line-default rounded px-2 py-1 bg-bg-primary text-text-primary"
        >
          <option value="">Select...</option>
          {slugs.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex-1 min-w-[140px]">
        <label className="text-xs text-text-muted block mb-0.5">Target</label>
        <select
          value={target}
          onChange={e => setTarget(e.target.value)}
          className="w-full text-xs border border-line-default rounded px-2 py-1 bg-bg-primary text-text-primary"
        >
          <option value="">Select...</option>
          {slugs.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="w-[140px]">
        <label className="text-xs text-text-muted block mb-0.5">Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full text-xs border border-line-default rounded px-2 py-1 bg-bg-primary text-text-primary"
        >
          {EDGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex-1 min-w-[140px]">
        <label className="text-xs text-text-muted block mb-0.5">Detail (optional)</label>
        <input
          type="text"
          value={detail}
          onChange={e => setDetail(e.target.value)}
          placeholder="Reason / notes"
          className="w-full text-xs border border-line-default rounded px-2 py-1 bg-bg-primary text-text-primary"
        />
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="px-3 py-1 text-xs rounded bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Add Edge
      </button>
    </form>
  );
}
