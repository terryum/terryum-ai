export default function SourceBadge({ sourceType }: { sourceType: string }) {
  return (
    <span className="inline-block text-xs font-medium text-text-muted bg-gray-100 border border-line-default rounded px-2 py-0.5">
      {sourceType}
    </span>
  );
}
