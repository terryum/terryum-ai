import ContentCard from './ContentCard';
import type { PostMeta } from '@/types/post';

interface ContentIndexPageProps {
  locale: string;
  title: string;
  description: string;
  posts: PostMeta[];
}

export default function ContentIndexPage({
  locale,
  title,
  description,
  posts,
}: ContentIndexPageProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-text-primary tracking-tight">{title}</h1>
      <p className="text-text-muted mt-2 mb-8">{description}</p>

      {posts.length === 0 ? (
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
