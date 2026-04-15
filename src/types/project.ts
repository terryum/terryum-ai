import type { ResourceLink, BilingualText } from './common';

/** @deprecated Use ResourceLink from common.ts instead */
export type ProjectLink = ResourceLink;

export interface ProjectMeta {
  slug: string;
  project_number?: number;
  title: BilingualText;
  description: BilingualText;
  cover_image: string;
  tech_stack: string[];
  links: ResourceLink[];
  embed_url?: string;
  status: 'active' | 'archived' | 'wip';
  featured: boolean;
  order: number;
  published_at: string;
  // ACL
  visibility?: 'public' | 'group';
  allowed_groups?: string[];
}
