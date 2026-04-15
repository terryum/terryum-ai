/**
 * Shared type definitions used across projects, surveys, and posts.
 */

/** Link to an external resource (GitHub, demo, paper, etc.) */
export interface ResourceLink {
  type: 'github' | 'demo' | 'paper' | 'book' | 'other';
  url: string;
  label?: string;
}

/** Bilingual text pair */
export interface BilingualText {
  ko: string;
  en: string;
}
