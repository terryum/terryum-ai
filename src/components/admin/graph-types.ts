export interface PaperRow {
  slug: string;
  title_en: string;
  title_ko: string;
  domain: string | null;
  taxonomy_primary: string | null;
  taxonomy_secondary: string[];
  key_concepts: string[];
  methodology: string[];
  contribution_type: string | null;
  source_author: string | null;
  source_date: string | null;
  published_at: string | null;
  meta_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface GraphEdgeRow {
  edge_id: string;
  source_slug: string;
  target_slug: string;
  edge_type: string;
  provenance: string;
  status: string;
  weight: number;
  detail: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodeLayoutRow {
  slug: string;
  view_id: string;
  x: number;
  y: number;
  pinned: boolean;
}

export type EdgeAction = 'approve' | 'reject' | 'delete';

export const EDGE_TYPES = [
  'builds_on',
  'uses_method',
  'shared_concepts',
  'shared_method',
  'same_field',
  'related',
  'compares_with',
  'addresses_task',
  'extends',
  'contradicts',
  'supports',
  'inspired_by',
] as const;
