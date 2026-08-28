import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentIdentity } from '@/lib/identity';
import { normalizedVisibility, type AccessFields } from '@/types/visibility';

export type AccessMeta = AccessFields;

/**
 * Enforce read access for a piece of content.
 *
 * - `public` (or undefined): no-op.
 * - `private`: admin role only. Otherwise redirect to /login.
 * - `group`: admin OR session group ∈ allowed_groups. Otherwise redirect.
 */
export async function requireReadAccess(
  meta: AccessMeta,
  currentPath: string,
): Promise<void> {
  const visibility = normalizedVisibility(meta.visibility);
  if (visibility === 'public') return;

  const id = await getCurrentIdentity();
  if (id?.role === 'admin') return;

  if (visibility === 'group' && id?.group) {
    const allowed = meta.allowed_groups ?? [];
    if (allowed.includes(id.group)) return;
  }

  redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
}

/** Pure predicate: does the current session have read access to this meta? */
export async function canReadContent(meta: AccessMeta): Promise<boolean> {
  const visibility = normalizedVisibility(meta.visibility);
  if (visibility === 'public') return true;
  const id = await getCurrentIdentity();
  if (id?.role === 'admin') return true;
  if (visibility === 'group' && id?.group) {
    const allowed = meta.allowed_groups ?? [];
    return allowed.includes(id.group);
  }
  return false;
}
