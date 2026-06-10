interface NumberedItem {
  post_number?: number;
  survey_number?: number;
  project_number?: number;
}

function getNumber(item: NumberedItem): number {
  return item.post_number ?? item.survey_number ?? item.project_number ?? 0;
}

export function byNumberDesc<T extends NumberedItem>(a: T, b: T): number {
  return getNumber(b) - getNumber(a);
}

export function sortByNumberDesc<T extends NumberedItem>(items: T[]): T[] {
  return items.slice().sort(byNumberDesc);
}

interface DatedItem extends NumberedItem {
  updated_at?: string;
  published_at?: string;
}

function getUpdatedTime(item: DatedItem): number {
  const date = item.updated_at ?? item.published_at;
  return date ? new Date(date).getTime() : 0;
}

/** Sort by "last updated" (updated_at, falling back to published_at) descending. */
export function byUpdatedDesc<T extends DatedItem>(a: T, b: T): number {
  const diff = getUpdatedTime(b) - getUpdatedTime(a);
  // Same date → keep newest number first for a stable, intuitive order.
  return diff !== 0 ? diff : byNumberDesc(a, b);
}

export function sortByUpdatedDesc<T extends DatedItem>(items: T[]): T[] {
  return items.slice().sort(byUpdatedDesc);
}
