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
  reading_time_min?: number;
  seo_title?: string;
  seo_description?: string;
  // Reading-specific fields
  source_url?: string;
  source_title?: string;
  source_author?: string;
  source_type?: string;
  // Translation tracking
  translation_of?: string | null;
  translated_to?: string[];
  newsletter_eligible?: boolean;
  featured?: boolean;
}

export interface Post {
  meta: PostMeta;
  content: string;
}
