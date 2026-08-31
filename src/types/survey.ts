import type { ResourceLink, BilingualText } from './common';
import type { AccessFields } from './visibility';

export interface SurveyMeta extends AccessFields {
  slug: string;
  content_type?: 'survey' | 'tutorial';
  survey_number?: number | null;
  tutorial_number?: number;
  title: BilingualText;
  description: BilingualText;
  cover_image: string;
  tech_stack: string[];
  toc: Array<BilingualText & { status?: 'planned' | 'ready' }>;
  links: ResourceLink[];
  embed_url?: string;
  preview_embed_url?: string;
  status: 'active' | 'archived' | 'wip';
  featured: boolean;
  order: number;
  published_at: string;
  updated_at?: string;
}
