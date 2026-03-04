'use client';

import { useState } from 'react';

interface TagItem {
  slug: string;
  label: string;
  count: number;
}

interface TagFilterBarProps {
  availableTags: TagItem[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  showMoreLabel: string;
  showLessLabel: string;
}

export default function TagFilterBar({
  availableTags,
  selectedSlugs,
  onToggle,
  showMoreLabel,
  showLessLabel,
}: TagFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-6">
      <div
        className={`flex flex-wrap gap-2 ${expanded ? '' : 'max-h-[4.5rem] overflow-hidden'}`}
      >
        {availableTags.map((tag) => {
          const isActive = selectedSlugs.includes(tag.slug);
          return (
            <button
              key={tag.slug}
              onClick={() => onToggle(tag.slug)}
              className={`inline-flex items-center text-xs rounded-full px-3 py-1.5 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-accent text-white'
                  : 'bg-bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              {tag.label}
              <span className="ml-1 opacity-60">{tag.count}</span>
            </button>
          );
        })}
      </div>
      {availableTags.length > 6 && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="text-xs text-accent mt-2 hover:underline cursor-pointer"
        >
          {expanded ? showLessLabel : showMoreLabel}
        </button>
      )}
    </div>
  );
}
