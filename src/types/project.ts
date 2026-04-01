export interface ProjectLink {
  type: 'github' | 'demo' | 'paper' | 'book' | 'other';
  url: string;
  label?: string;
}

export interface ProjectMeta {
  slug: string;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  cover_image: string;
  tech_stack: string[];
  links: ProjectLink[];
  embed_url?: string;
  status: 'active' | 'archived' | 'wip';
  featured: boolean;
  order: number;
  published_at: string;
}
