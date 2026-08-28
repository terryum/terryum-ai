import type { ResourceLink, BilingualText } from './common';
import type { AccessFields } from './visibility';

export interface SurveyMeta extends AccessFields {
  slug: string;
  survey_number: number;
  title: BilingualText;
  description: BilingualText;
  cover_image: string;
  tech_stack: string[];
  toc: BilingualText[]; // table of contents (chapter titles, bilingual)
  links: ResourceLink[];
  embed_url?: string;
  status: 'active' | 'archived' | 'wip';
  featured: boolean;
  order: number;
  published_at: string;
  updated_at?: string;
}
