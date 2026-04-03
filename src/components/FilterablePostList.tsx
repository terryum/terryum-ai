'use client';

import { useState, useCallback, useMemo, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import TagFilterBar from './TagFilterBar';
import ContentCard from './ContentCard';

const TaxonomyFilter = dynamic(() => import('./TaxonomyFilter'), { ssr: false });
const GraphPopup = dynamic(() => import('./GraphPopup'), { ssr: false });
import { normalizeTagSlug } from '@/lib/tags';
import { TAB_TAG_SLUGS } from '@/lib/site-config';
import { getPostsForTab, getPostsForAuthor } from '@/lib/tabs';
import { getDisplayTags } from '@/lib/display';
import type { PostMeta } from '@/types/post';
import type { TagItem } from '@/types/tag';
import type { TaxonomyNodeData } from '@/lib/content-page-helpers';
import type { Locale } from '@/lib/i18n';

interface TabTitleEntry {
  title: string;
  description: string;
}

interface FilterablePostListProps {
  locale: Locale;
  posts: PostMeta[];
  allTags: TagItem[];
  initialSelectedTags: string[];
  showMoreLabel: string;
  showLessLabel: string;
  noResultsLabel: string;
  defaultTitle: string;
  defaultDescription: string;
  tabTitles?: Record<string, TabTitleEntry>;
  taxonomyNodes?: Record<string, TaxonomyNodeData>;
  taxonomyStats?: Record<string, number>;
}

const PAGE_SIZE = 10;

function FilterablePostListInner({
  locale,
  posts,
  allTags,
  initialSelectedTags,
  showMoreLabel,
  showLessLabel,
  noResultsLabel,
  defaultTitle,
  defaultDescription,
  tabTitles,
  taxonomyNodes = {},
  taxonomyStats = {},
}: FilterablePostListProps) {
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get('tab');
  const selectedAuthor = searchParams.get('author') as 'terry' | 'ai' | null;

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tagsParam = params.get('tags');
      if (tagsParam) {
        return tagsParam.split(',').filter(t => t && !TAB_TAG_SLUGS.has(t));
      }
    }
    return initialSelectedTags;
  });

  const [starredOnly, setStarredOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('starred') === 'true';
    }
    return false;
  });

  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  // Mobile/narrow: taxonomy panel collapsed by default
  const [mobileTaxonomyOpen, setMobileTaxonomyOpen] = useState(false);

  // Reset tags, starred, and taxonomy when tab or author changes
  const currentScope = selectedTab || selectedAuthor;
  const prevScopeRef = useRef(currentScope);
  useEffect(() => {
    if (prevScopeRef.current !== currentScope) {
      prevScopeRef.current = currentScope;
      setSelectedTags([]);
      setStarredOnly(false);
      setSelectedTaxonomy(null);
      setMobileTaxonomyOpen(false);
      setCurrentPage(1);
    }
  }, [currentScope]);

  // Reset tags when taxonomy changes (selected tags may not exist in new scope)
  const prevTaxonomyRef = useRef(selectedTaxonomy);
  useEffect(() => {
    if (prevTaxonomyRef.current !== selectedTaxonomy) {
      prevTaxonomyRef.current = selectedTaxonomy;
      setSelectedTags([]);
      setCurrentPage(1);
    }
  }, [selectedTaxonomy]);

  // Sync tags and starred to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentTab = params.get('tab');
    const currentAuthor = params.get('author');
    const newParams = new URLSearchParams();
    if (currentTab) newParams.set('tab', currentTab);
    else if (currentAuthor) newParams.set('author', currentAuthor);
    if (selectedTags.length > 0) newParams.set('tags', selectedTags.join(','));
    if (starredOnly) newParams.set('starred', 'true');
    const qs = newParams.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [selectedTags, starredOnly]);

  // Listen for popstate (back/forward)
  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      const tags = params.get('tags');
      setSelectedTags(tags ? tags.split(',').filter(t => t && !TAB_TAG_SLUGS.has(t)) : []);
      setStarredOnly(params.get('starred') === 'true');
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleToggle = useCallback((slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setCurrentPage(1);
  }, []);

  // 1st pass: filter by tab or author
  const tabFilteredPosts = useMemo(() => {
    if (selectedTab) return getPostsForTab(posts, selectedTab);
    if (selectedAuthor) return getPostsForAuthor(posts, selectedAuthor);
    return posts;
  }, [posts, selectedTab, selectedAuthor]);

  // 2nd pass: filter by taxonomy (before tags, so tags reflect taxonomy scope)
  const taxonomyFilteredPosts = useMemo(() => {
    if (!selectedTaxonomy) return tabFilteredPosts;
    const matchNodes = new Set<string>();
    function collectDescendants(nodeId: string) {
      matchNodes.add(nodeId);
      const n = taxonomyNodes[nodeId];
      for (const child of n?.children ?? []) collectDescendants(child);
    }
    collectDescendants(selectedTaxonomy);
    return tabFilteredPosts.filter(p =>
      (p.taxonomy_primary && matchNodes.has(p.taxonomy_primary)) ||
      (p.taxonomy_secondary || []).some(s => matchNodes.has(s))
    );
  }, [tabFilteredPosts, selectedTaxonomy, taxonomyNodes]);

  // 3rd pass: filter by topic tags (within taxonomy scope)
  const tagFilteredPosts = useMemo(() => {
    if (selectedTags.length === 0) return taxonomyFilteredPosts;
    return taxonomyFilteredPosts.filter((post) => {
      const postTagSlugs = getDisplayTags(post).map((t) => normalizeTagSlug(t));
      return selectedTags.every((sel) => postTagSlugs.includes(sel));
    });
  }, [taxonomyFilteredPosts, selectedTags]);

  // 4th pass: filter by starred
  const finalPosts = useMemo(() => {
    if (!starredOnly) return tagFilteredPosts;
    return tagFilteredPosts.filter(p => p.starred);
  }, [tagFilteredPosts, starredOnly]);

  // Available tags: computed from taxonomy-filtered posts (counts reflect taxonomy scope)
  const availableTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    for (const post of taxonomyFilteredPosts) {
      for (const tag of getDisplayTags(post)) {
        const slug = normalizeTagSlug(tag);
        if (!TAB_TAG_SLUGS.has(slug)) {
          tagCounts.set(slug, (tagCounts.get(slug) || 0) + 1);
        }
      }
    }
    return Array.from(tagCounts.entries())
      .map(([slug, count]) => {
        const existing = allTags.find((t) => t.slug === slug);
        return { slug, label: existing?.label || slug, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [allTags, taxonomyFilteredPosts]);

  const currentTitle = (selectedTab && tabTitles?.[selectedTab]?.title) || (selectedAuthor && tabTitles?.[selectedAuthor]?.title) || defaultTitle;
  const currentDescription = (selectedTab && tabTitles?.[selectedTab]?.description) || (selectedAuthor && tabTitles?.[selectedAuthor]?.description) || defaultDescription;

  const [graphOpen, setGraphOpen] = useState(false);

  const hasTaxonomy = selectedTab === 'papers' && Object.keys(taxonomyNodes).length > 0;
  const taxonomyHeading = locale === 'ko' ? '분야별 탐색' : 'Browse by Field';

  return (
    <div>
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{currentTitle}</h1>
        <button
          onClick={() => setGraphOpen(true)}
          className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-surface-muted transition-colors"
          title={locale === 'ko' ? '지식 그래프 보기' : 'View Knowledge Graph'}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="5" cy="6" r="2.5" />
            <circle cx="19" cy="6" r="2.5" />
            <circle cx="12" cy="18" r="2.5" />
            <path d="M7.5 7L10.5 16M16.5 7L13.5 16M7.5 6H16.5" />
          </svg>
        </button>
      </div>
      <p className="text-sm text-text-muted mt-2 mb-8">{currentDescription}</p>

      <GraphPopup open={graphOpen} onClose={() => setGraphOpen(false)} locale={locale} />

      {/* relative wrapper: xl+ outside sidebar uses absolute positioning */}
      <div className="relative">

        {/* xl+: sticky sidebar outside the content area (to the left) */}
        {hasTaxonomy && (
          <aside
            className="hidden xl:block absolute top-0 bottom-0 w-44 pr-4"
            style={{ right: 'calc(100% + 1rem)' }}
          >
            <div className="sticky top-24">
              <TaxonomyFilter
                variant="sidebar"
                locale={locale}
                nodes={taxonomyNodes}
                stats={taxonomyStats}
                selectedTaxonomy={selectedTaxonomy}
                onSelect={setSelectedTaxonomy}
              />
            </div>
          </aside>
        )}

        {/* Main content: always full Container width */}
        <div>

          {/* Mobile / narrow (< xl): collapsible taxonomy at top */}
          {hasTaxonomy && (
            <div className="xl:hidden mb-6">
              <div className="border border-line-default rounded-lg overflow-hidden">
                <button
                  onClick={() => setMobileTaxonomyOpen(v => !v)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide hover:bg-surface-muted transition-colors"
                >
                  <span>{taxonomyHeading}</span>
                  <span className="text-[10px]">{mobileTaxonomyOpen ? '▾' : '▸'}</span>
                </button>
                {mobileTaxonomyOpen && (
                  <div className="px-3 pb-3 pt-1">
                    <TaxonomyFilter
                      variant="inline"
                      locale={locale}
                      nodes={taxonomyNodes}
                      stats={taxonomyStats}
                      selectedTaxonomy={selectedTaxonomy}
                      onSelect={(id) => {
                        setSelectedTaxonomy(id);
                        if (id !== null) setMobileTaxonomyOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              {/* Show selected taxonomy label when collapsed */}
              {!mobileTaxonomyOpen && selectedTaxonomy && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-accent font-medium">
                    {locale === 'ko'
                      ? taxonomyNodes[selectedTaxonomy]?.label.ko
                      : taxonomyNodes[selectedTaxonomy]?.label.en}
                  </span>
                  <button
                    onClick={() => setSelectedTaxonomy(null)}
                    className="text-xs text-text-muted hover:text-accent transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <TagFilterBar
            availableTags={availableTags}
            selectedSlugs={selectedTags}
            onToggle={handleToggle}
            showMoreLabel={showMoreLabel}
            showLessLabel={showLessLabel}
          />

          {finalPosts.length === 0 ? (
            <p className="text-text-muted py-8 text-center">{noResultsLabel}</p>
          ) : (
            <div ref={listRef}>
              {finalPosts
                .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                .map((post) => (
                  <ContentCard key={post.post_id} post={post} locale={locale} />
                ))}

              {/* Pagination */}
              {finalPosts.length > PAGE_SIZE && (() => {
                const totalPages = Math.ceil(finalPosts.length / PAGE_SIZE);
                const goTo = (page: number) => {
                  setCurrentPage(page);
                  listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                };
                return (
                  <nav className="flex items-center justify-center gap-1 mt-8 mb-4">
                    <button
                      onClick={() => goTo(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-sm text-text-muted hover:text-accent disabled:opacity-30 disabled:cursor-default transition-colors"
                    >
                      ←
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => goTo(page)}
                        className={`min-w-[2rem] px-2 py-1 text-sm rounded transition-colors ${
                          page === currentPage
                            ? 'bg-accent text-white font-bold'
                            : 'text-text-muted hover:text-accent hover:bg-surface-muted'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => goTo(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 text-sm text-text-muted hover:text-accent disabled:opacity-30 disabled:cursor-default transition-colors"
                    >
                      →
                    </button>
                  </nav>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FilterablePostList(props: FilterablePostListProps) {
  return (
    <Suspense fallback={
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{props.defaultTitle}</h1>
        <p className="text-sm text-text-muted mt-2 mb-8">{props.defaultDescription}</p>
      </div>
    }>
      <FilterablePostListInner {...props} />
    </Suspense>
  );
}
