export const VISIBILITIES = ['public', 'private', 'group'] as const;

export type Visibility = (typeof VISIBILITIES)[number];

export interface AccessFields {
  visibility?: Visibility;
  allowed_groups?: string[];
}

export function normalizedVisibility(value: Visibility | undefined): Visibility {
  return value ?? 'public';
}
