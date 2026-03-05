export default function ListSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-10 animate-pulse">
      {/* Title skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-bg-surface rounded" />
        <div className="h-4 w-72 bg-bg-surface rounded mt-2" />
      </div>

      {/* Card list skeleton */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-4 py-6 border-b border-line-default">
          <div className="hidden sm:block flex-shrink-0 w-24 h-24 bg-bg-surface rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-bg-surface rounded" />
            <div className="h-3 w-full bg-bg-surface rounded" />
            <div className="h-3 w-1/2 bg-bg-surface rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-3 w-20 bg-bg-surface rounded" />
              <div className="h-3 w-12 bg-bg-surface rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
