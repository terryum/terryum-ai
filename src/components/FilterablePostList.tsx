'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import TagFilterBar from './TagFilterBar';
import ContentCard from './ContentCard';
import SearchBar from './SearchBar';
import Pagination from './posts/Pagination';
import { useFilterableUrlState } from './posts/useFilterableUrlState';
import { useFilteredPosts } from './posts/useFilteredPosts';

const TaxonomyFilter = dynamic(() => import('./TaxonomyFilter'), { ssr: false });
const GraphPopup = dynamic(() => import('./GraphPopup'), { ssr: false });
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
  searchPlaceholder?: string;
  searchingLabel?: string;
  searchNoResultsLabel?: string;
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
  searchPlaceholder,
  searchingLabel,
  searchNoResultsLabel,
}: FilterablePostListProps) {
  const searchParams = useSearchParams();
  const selectedTab = searchParams.get('tab');

  const { selectedTags, setSelectedTags, starredOnly, setStarredOnly } =
    useFilterableUrlState(initialSelectedTags);

  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  const [mobileTaxonomyOpen, setMobileTaxonomyOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);

  // Reset tags, starred, taxonomy when tab changes.
  const prevScopeRef = useRef(selectedTab);
  useEffect(() => {
    if (prevScopeRef.current !== selectedTab) {
      prevScopeRef.current = selectedTab;
      setSelectedTags([]);
      setStarredOnly(false);
      setSelectedTaxonomy(null);
      setMobileTaxonomyOpen(false);
      setCurrentPage(1);
    }
  }, [selectedTab, setSelectedTags, setStarredOnly]);

  // Reset tags when taxonomy changes (selected tags may not exist in new scope).
  const prevTaxonomyRef = useRef(selectedTaxonomy);
  useEffect(() => {
    if (prevTaxonomyRef.current !== selectedTaxonomy) {
      prevTaxonomyRef.current = selectedTaxonomy;
      setSelectedTags([]);
      setCurrentPage(1);
    }
  }, [selectedTaxonomy, setSelectedTags]);

  const handleToggle = useCallback((slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
    setCurrentPage(1);
  }, [setSelectedTags]);

  const { finalPosts, availableTags } = useFilteredPosts({
    posts,
    allTags,
    selectedTab,
    selectedTaxonomy,
    taxonomyNodes,
    selectedTags,
    starredOnly,
  });

  const currentTitle =
    (selectedTab && tabTitles?.[selectedTab]?.title) || defaultTitle;
  const currentDescription =
    (selectedTab && tabTitles?.[selectedTab]?.description) || defaultDescription;

  const [graphOpen, setGraphOpen] = useState(false);

  const hasTaxonomy = selectedTab === 'papers' && Object.keys(taxonomyNodes).length > 0;
  const taxonomyHeading = locale === 'ko' ? '분야별 탐색' : 'Browse by Field';

  const totalPages = Math.ceil(finalPosts.length / PAGE_SIZE);
  const goToPage = (page: number) => {
    setCurrentPage(page);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">{currentTitle}</h1>
      <p className="text-sm text-text-muted mt-2 mb-8">{currentDescription}</p>

      <GraphPopup open={graphOpen} onClose={() => setGraphOpen(false)} locale={locale} />

      <div className="relative">

        {/* xl+: sticky sidebar outside the content area (to the left) */}
        {hasTaxonomy && (
          <aside
            className="hidden xl:block absolute top-0 bottom-0 w-44 pr-4"
            style={{ right: 'calc(100% + 1rem)' }}
          >
            <div className="sticky top-24">
              <button
                onClick={() => setGraphOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2.5 mb-4 rounded-lg border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/50 transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="5" cy="6" r="2" />
                  <circle cx="19" cy="6" r="2" />
                  <circle cx="12" cy="18" r="2" />
                  <path d="M7 7l3.5 9M17 7l-3.5 9M7 6h10" />
                </svg>
                Paper Map
              </button>
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

        <div>

          {/* Mobile / narrow (< xl): Paper Map button + collapsible taxonomy */}
          {hasTaxonomy && (
            <div className="xl:hidden mb-6">
              <button
                onClick={() => setGraphOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-3 rounded-lg border border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/50 transition-colors text-sm font-semibold"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="5" cy="6" r="2" />
                  <circle cx="19" cy="6" r="2" />
                  <circle cx="12" cy="18" r="2" />
                  <path d="M7 7l3.5 9M17 7l-3.5 9M7 6h10" />
                </svg>
                Paper Map
              </button>
              <div className="border border-line-default rounded-lg overflow-hidden">
                <button
                  onClick={() => setMobileTaxonomyOpen((v) => !v)}
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

          {searchPlaceholder && (
            <SearchBar
              locale={locale}
              posts={posts}
              placeholder={searchPlaceholder}
              searchingLabel={searchingLabel || ''}
              noResultsLabel={searchNoResultsLabel || ''}
              onSearchActive={setSearchActive}
            />
          )}

          {!searchActive && (
            <TagFilterBar
              availableTags={availableTags}
              selectedSlugs={selectedTags}
              onToggle={handleToggle}
              showMoreLabel={showMoreLabel}
              showLessLabel={showLessLabel}
            />
          )}

          {searchActive ? null : finalPosts.length === 0 ? (
            <p className="text-text-muted py-8 text-center">{noResultsLabel}</p>
          ) : (
            <div ref={listRef}>
              {finalPosts
                .slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
                .map((post) => (
                  <ContentCard key={post.post_id} post={post} locale={locale} />
                ))}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
              />
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
