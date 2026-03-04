export interface FigureItem {
  src: string;
  caption: string;
  caption_ko?: string;
  number: number;
}

export interface Reference {
  title: string;
  author?: string;
  description: string;
  arxiv_url?: string;
  scholar_url?: string;
  project_url?: string;
  post_slug?: string;
  category?: 'foundational' | 'recent';
}

export interface PostMeta {
  post_id: string;
  locale: string;
  title: string;
  summary: string;
  slug: string;
  published_at: string;
  updated_at: string;
  status: 'draft' | 'published';
  content_type: 'writing' | 'reading';
  tags: string[];
  cover_image: string;
  cover_caption?: string;
  cover_thumb?: string;
  card_summary?: string;
  reading_time_min?: number;
  seo_title?: string;
  seo_description?: string;
  // Reading-specific fields
  source_url?: string;
  source_title?: string;
  source_author?: string;
  source_type?: string;
  source_project_url?: string;
  source_authors_full?: string[];
  first_author_scholar_url?: string;
  // Key references
  references?: Reference[];
  // Figure/Table galleries
  figures?: FigureItem[];
  tables?: FigureItem[];
  // Translation tracking
  translation_of?: string | null;
  translated_to?: string[];
  terrys_memo?: string;
  newsletter_eligible?: boolean;
  featured?: boolean;
}

export interface Post {
  meta: PostMeta;
  content: string;
}
