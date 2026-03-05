export default function DetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-10 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-24 bg-bg-surface rounded mb-6" />

      {/* Header skeleton */}
      <div className="mb-8 space-y-3">
        <div className="h-8 w-full bg-bg-surface rounded" />
        <div className="h-8 w-2/3 bg-bg-surface rounded" />
        <div className="flex gap-3 mt-3">
          <div className="h-3 w-24 bg-bg-surface rounded" />
          <div className="h-3 w-16 bg-bg-surface rounded" />
        </div>
        <div className="flex gap-2 mt-2">
          <div className="h-5 w-14 bg-bg-surface rounded-full" />
          <div className="h-5 w-14 bg-bg-surface rounded-full" />
        </div>
      </div>

      {/* Cover image skeleton */}
      <div className="w-full aspect-video bg-bg-surface rounded-lg mb-8" />

      {/* Content skeleton */}
      <div className="space-y-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full bg-bg-surface rounded" />
            <div className="h-4 w-5/6 bg-bg-surface rounded" />
            <div className="h-4 w-4/6 bg-bg-surface rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
