'use client';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
}

export default function Collapsible({ title, children }: CollapsibleProps) {
  return (
    <details className="group border border-line-default rounded-lg my-6 overflow-hidden">
      <summary className="flex items-center justify-between cursor-pointer px-4 py-3 bg-bg-surface/40 hover:bg-bg-surface transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="font-medium text-text-primary text-sm">{title}</span>
        <svg
          className="w-4 h-4 text-text-muted transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </summary>
      <div className="px-4 pb-4 pt-2 text-sm text-text-secondary leading-relaxed">
        {children}
      </div>
    </details>
  );
}
