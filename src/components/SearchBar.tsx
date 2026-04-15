'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PostMeta } from '@/types/post';

interface SearchResult {
  slug: string;
  title_ko: string;
  title_en: string;
  domain: string | null;
  taxonomy_primary: string | null;
  rank: number;
  source: 'fts' | 'graph';
}

interface SearchBarProps {
  locale: string;
  posts: PostMeta[];
  placeholder: string;
  searchingLabel: string;
  noResultsLabel: string;
  onSearchActive?: (active: boolean) => void;
}

function clientSearch(query: string, posts: PostMeta[], locale: string): PostMeta[] {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored = posts.map(post => {
    const haystack = [
      post.title,
      post.summary,
      post.domain,
      ...(post.key_concepts || []),
      ...(post.subfields || []),
      ...(post.tags || []),
      post.ai_summary?.one_liner,
      post.ai_summary?.problem,
      post.ai_summary?.solution,
      post.source_author,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    let score = 0;
    for (const token of tokens) {
      if (haystack.includes(token)) score++;
    }
    return { post, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(s => s.post);
}

export default function SearchBar({
  locale,
  posts,
  placeholder,
  searchingLabel,
  noResultsLabel,
  onSearchActive,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [fallbackResults, setFallbackResults] = useState<PostMeta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  const hasResults = useFallback ? fallbackResults.length > 0 : results.length > 0;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent about search active state
  useEffect(() => {
    onSearchActive?.(isOpen && query.length > 0);
  }, [isOpen, query, onSearchActive]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setFallbackResults([]);
      setIsOpen(false);
      setUseFallback(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);
    setSelectedIndex(-1);

    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(q)}&lang=${locale}&limit=10`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.fallback) throw new Error('fallback');
      setResults(data.results || []);
      setUseFallback(false);
    } catch {
      // Fallback to client-side search
      const local = clientSearch(q, posts, locale);
      setFallbackResults(local);
      setUseFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [posts, locale]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setFallbackResults([]);
      setIsOpen(false);
      setUseFallback(false);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }, [doSearch]);

  const navigateTo = useCallback((slug: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/${locale}/posts/${slug}`);
  }, [locale, router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const itemCount = useFallback ? fallbackResults.length : results.length;
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, itemCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const slug = useFallback
        ? fallbackResults[selectedIndex]?.slug
        : results[selectedIndex]?.slug;
      if (slug) navigateTo(slug);
    } else if (e.key === 'Enter' && itemCount > 0) {
      e.preventDefault();
      const slug = useFallback
        ? fallbackResults[0]?.slug
        : results[0]?.slug;
      if (slug) navigateTo(slug);
    }
  }, [results, fallbackResults, useFallback, selectedIndex, navigateTo]);

  const getTitle = (item: SearchResult) =>
    locale === 'ko' ? item.title_ko : item.title_en;

  return (
    <div ref={containerRef} className="relative mb-4">
      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-line-default rounded-lg bg-bg-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors"
        />

        {/* Loading spinner or clear button */}
        {isLoading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : query && (
          <button
            onClick={() => { handleChange(''); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute z-40 top-full left-0 right-0 mt-1 bg-bg-primary border border-line-default rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-text-muted">{searchingLabel}</div>
          ) : !hasResults ? (
            <div className="px-4 py-3 text-sm text-text-muted">{noResultsLabel}</div>
          ) : useFallback ? (
            fallbackResults.map((post, i) => (
              <button
                key={post.slug}
                onClick={() => navigateTo(post.slug)}
                className={`w-full text-left px-4 py-3 hover:bg-surface-muted transition-colors border-b border-line-default last:border-b-0 ${
                  i === selectedIndex ? 'bg-surface-muted' : ''
                }`}
              >
                <div className="text-sm font-medium text-text-primary line-clamp-1">
                  {post.title}
                </div>
                {post.summary && (
                  <div className="text-xs text-text-muted mt-0.5 line-clamp-1">
                    {post.summary}
                  </div>
                )}
              </button>
            ))
          ) : (
            results.map((item, i) => (
              <button
                key={item.slug}
                onClick={() => navigateTo(item.slug)}
                className={`w-full text-left px-4 py-3 hover:bg-surface-muted transition-colors border-b border-line-default last:border-b-0 ${
                  i === selectedIndex ? 'bg-surface-muted' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary line-clamp-1 flex-1">
                    {getTitle(item)}
                  </span>
                  {item.source === 'graph' && (
                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                      related
                    </span>
                  )}
                </div>
                {item.domain && (
                  <div className="text-xs text-text-muted mt-0.5">
                    {item.domain}
                    {item.taxonomy_primary && ` / ${item.taxonomy_primary.split('/').pop()}`}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
