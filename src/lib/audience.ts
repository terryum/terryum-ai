import 'server-only';
import { cache } from 'react';
import { getCurrentIdentity } from '@/lib/identity';
import indexJson from '../../posts/index.json';
import { normalizedVisibility, type AccessFields } from '@/types/visibility';

export interface Audience {
  isAdmin: boolean;
  group: string | null;
}

export const getAudience = cache(async (): Promise<Audience> => {
  const id = await getCurrentIdentity();
  if (!id) return { isAdmin: false, group: null };
  return { isAdmin: id.role === 'admin', group: id.group };
});

function isVisibleTo(access: AccessFields, audience: Audience): boolean {
  if (audience.isAdmin) return true;
  const v = normalizedVisibility(access.visibility);
  if (v === 'public') return true;
  if (v === 'group' && audience.group) {
    return access.allowed_groups?.includes(audience.group) ?? false;
  }
  return false;
}

export function filterByAudience<T extends AccessFields>(
  items: T[],
  audience: Audience,
): T[] {
  if (audience.isAdmin) return items;
  return items.filter((it) => isVisibleTo(it, audience));
}

export const PUBLIC_AUDIENCE: Audience = { isAdmin: false, group: null };

const SLUG_ACCESS_MAP: Record<string, AccessFields> = (() => {
  const map: Record<string, AccessFields> = {};
  const posts = (indexJson as { posts?: Array<Record<string, unknown>> }).posts ?? [];
  for (const p of posts) {
    const slug = p.slug as string | undefined;
    if (!slug) continue;
    const visibility = p.visibility as AccessFields['visibility'];
    if (visibility && visibility !== 'public') {
      map[slug] = {
        visibility,
        allowed_groups: (p.allowed_groups as string[] | undefined) ?? [],
      };
    }
  }
  return map;
})();

export function isSlugVisibleToAudience(slug: string, audience: Audience): boolean {
  const access = SLUG_ACCESS_MAP[slug];
  if (!access) return true;
  return isVisibleTo(access, audience);
}
