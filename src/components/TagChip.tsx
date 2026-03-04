interface TagChipProps {
  tag: string;
  label?: string;
  active?: boolean;
  onClick?: () => void;
}

export default function TagChip({ tag, label, active, onClick }: TagChipProps) {
  const display = label || tag;
  const baseClass = 'inline-block text-xs rounded px-2 py-0.5';
  const colorClass = active
    ? 'bg-accent text-white'
    : 'bg-bg-surface text-text-muted';
  const interactiveClass = onClick ? 'cursor-pointer' : '';

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${baseClass} ${colorClass} ${interactiveClass}`}
      >
        {display}
      </button>
    );
  }

  return (
    <span className={`${baseClass} ${colorClass}`}>
      {display}
    </span>
  );
}
