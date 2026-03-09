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

export interface PostRelation {
  target: string;
  type: 'builds_on' | 'extends' | 'contradicts' | 'supports' | 'compares_with' | 'related' | 'inspired_by';
}

export interface AISummary {
  one_liner: string;
  problem: string;
  solution: string;
  key_result: string;
  limitations: string[];
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
  content_type: 'writing' | 'reading' | 'essay';
  tags: string[];
  cover_image: string;
  cover_caption?: string;
  cover_thumb?: string;
  thumb_fit?: 'cover' | 'contain';
  card_summary?: string;
  reading_time_min?: number;
  seo_title?: string;
  seo_description?: string;
  // Reading-specific fields
  source_date?: string;
  source_url?: string;
  source_title?: string;
  source_author?: string;
  source_type?: string;
  source_project_url?: string;
  source_authors_full?: string[];
  first_author_scholar_url?: string;
  google_scholar_url?: string;
  citation_count?: number;
  citation_status?: 'manual' | 'ok' | 'failed';
  citation_manual?: boolean;
  citation_updated_at?: string;
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
  // AI Memory fields
  post_number?: number;
  domain?: string;
  subfields?: string[];
  key_concepts?: string[];
  methodology?: string[];
  contribution_type?: 'method' | 'benchmark' | 'survey' | 'theoretical' | 'system' | 'analysis';
  relations?: PostRelation[];
  ai_summary?: AISummary;
  // Ideas-specific
  idea_status?: 'hypothesis' | 'exploring' | 'validated' | 'abandoned' | 'incorporated';
  related_posts?: string[];
}

export interface Post {
  meta: PostMeta;
  content: string;
}
