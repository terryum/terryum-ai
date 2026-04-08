export interface SurveyLink {
  type: 'demo' | 'github' | 'paper' | 'book' | 'other';
  url: string;
  label?: string;
}

export interface SurveyMeta {
  slug: string;
  survey_number: number;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  cover_image: string;
  tech_stack: string[];
  toc: string[]; // table of contents (chapter titles)
  links: SurveyLink[];
  embed_url?: string;
  status: 'active' | 'archived' | 'wip';
  featured: boolean;
  order: number;
  published_at: string;
  // ACL
  visibility?: 'public' | 'group';
  allowed_groups?: string[];
}
