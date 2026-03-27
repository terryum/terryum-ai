'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';

interface TaxonomyNode {
  label: { ko: string; en: string };
  children: string[];
}

interface TaxonomyFilterProps {
  locale: Locale;
  nodes: Record<string, TaxonomyNode>;
  stats: Record<string, number>;
  selectedTaxonomy: string | null;
  onSelect: (nodeId: string | null) => void;
  variant?: 'inline' | 'sidebar';
}

const ROOT_NODES = ['robotics', 'ai'];

function TaxonomyNodeItem({
  nodeId,
  node,
  stats,
  selectedTaxonomy,
  onSelect,
  locale,
  nodes,
  depth,
}: {
  nodeId: string;
  node: TaxonomyNode;
  stats: Record<string, number>;
  selectedTaxonomy: string | null;
  onSelect: (id: string | null) => void;
  locale: Locale;
  nodes: Record<string, TaxonomyNode>;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const label = locale === 'ko' ? node.label.ko : node.label.en;
  const count = stats[nodeId] ?? 0;
  const hasChildren = node.children.length > 0;
  const isSelected = selectedTaxonomy === nodeId;

  return (
    <div className={depth > 0 ? `${depth >= 2 ? 'ml-2' : 'ml-3'} border-l border-line-default pl-2` : ''}>
      <div className="flex items-center gap-1 py-0.5">
        {hasChildren && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-text-muted hover:text-text-primary transition-colors text-xs w-4 shrink-0"
            aria-label={expanded ? 'collapse' : 'expand'}
          >
            {expanded ? '▾' : '▸'}
          </button>
        )}
        {!hasChildren && <span className="w-4 shrink-0" />}

        <button
          onClick={() => onSelect(isSelected ? null : nodeId)}
          className={`flex-1 flex items-center justify-between gap-1 text-left text-sm px-2 py-0.5 rounded transition-colors ${
            isSelected
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
          }`}
        >
          <span>{label}</span>
          {count > 0 && (
            <span className="font-mono text-xs text-text-muted shrink-0">{count}</span>
          )}
        </button>
      </div>

      {hasChildren && expanded && (
        <div className="mt-0.5">
          {node.children.map((childId) => {
            const childNode = nodes[childId];
            if (!childNode) return null;
            return (
              <TaxonomyNodeItem
                key={childId}
                nodeId={childId}
                node={childNode}
                stats={stats}
                selectedTaxonomy={selectedTaxonomy}
                onSelect={onSelect}
                locale={locale}
                nodes={nodes}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TaxonomyFilter({
  locale,
  nodes,
  stats,
  selectedTaxonomy,
  onSelect,
  variant = 'inline',
}: TaxonomyFilterProps) {
  const heading = locale === 'ko' ? '분야별 탐색' : 'Browse by Field';
  const clearLabel = locale === 'ko' ? '전체 보기' : 'All';

  const treeNodes = (
    <div className="flex flex-col gap-0.5">
      {ROOT_NODES.map((rootId) => {
        const node = nodes[rootId];
        if (!node) return null;
        return (
          <TaxonomyNodeItem
            key={rootId}
            nodeId={rootId}
            node={node}
            stats={stats}
            selectedTaxonomy={selectedTaxonomy}
            onSelect={onSelect}
            locale={locale}
            nodes={nodes}
            depth={0}
          />
        );
      })}
    </div>
  );

  if (variant === 'sidebar') {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
            {heading}
          </span>
          {selectedTaxonomy && (
            <button
              onClick={() => onSelect(null)}
              className="text-xs text-accent hover:underline transition-colors"
            >
              {clearLabel}
            </button>
          )}
        </div>
        {treeNodes}
      </div>
    );
  }

  // inline (default): tree only, no card wrapper (heading is handled by collapsible parent)
  return <div>{treeNodes}</div>;
}
