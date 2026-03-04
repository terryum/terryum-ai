'use client';

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
}

export default function Collapsible({ title, children }: CollapsibleProps) {
  return (
    <details className="group my-6">
      <summary className="flex items-center gap-2 cursor-pointer font-semibold text-text-primary hover:text-accent transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
        <svg
          className="w-4 h-4 text-text-muted transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>{title}</span>
      </summary>
      <div className="pt-3 text-text-secondary leading-relaxed">
        {children}
      </div>
    </details>
  );
}
