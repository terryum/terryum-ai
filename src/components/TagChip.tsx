export default function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-block text-xs text-text-muted bg-bg-surface rounded px-2 py-0.5">
      {tag}
    </span>
  );
}
