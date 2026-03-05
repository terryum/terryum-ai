import ContentCard from './ContentCard';
import FilterablePostList from './FilterablePostList';
import type { PostMeta } from '@/types/post';

interface TagItem {
  slug: string;
  label: string;
  count: number;
}

interface FilterDict {
  show_more: string;
  show_less: string;
  no_results: string;
}

interface ContentIndexPageProps {
  locale: string;
  title: string;
  description: string;
  posts: PostMeta[];
  allTags?: TagItem[];
  initialSelectedTags?: string[];
  filterDict?: FilterDict;
}

export default function ContentIndexPage({
  locale,
  title,
  description,
  posts,
  allTags,
  initialSelectedTags,
  filterDict,
}: ContentIndexPageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
      <p className="text-sm text-text-muted mt-2 mb-8">{description}</p>

      {allTags && filterDict ? (
        <FilterablePostList
          locale={locale}
          posts={posts}
          allTags={allTags}
          initialSelectedTags={initialSelectedTags || []}
          showMoreLabel={filterDict.show_more}
          showLessLabel={filterDict.show_less}
          noResultsLabel={filterDict.no_results}
        />
      ) : posts.length === 0 ? (
        <p className="text-text-muted py-8 text-center">No posts yet.</p>
      ) : (
        <div>
          {posts.map((post) => (
            <ContentCard key={post.post_id} post={post} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
