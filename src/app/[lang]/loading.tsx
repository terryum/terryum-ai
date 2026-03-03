export default function HomeLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 lg:px-8 animate-pulse">
      {/* Hero skeleton */}
      <div className="flex flex-col sm:flex-row items-center gap-6 py-10">
        <div className="flex-shrink-0 w-28 h-28 rounded-full bg-bg-surface" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-40 bg-bg-surface rounded" />
          <div className="h-4 w-56 bg-bg-surface rounded" />
          <div className="flex gap-3 mt-3">
            <div className="h-5 w-5 bg-bg-surface rounded" />
            <div className="h-5 w-5 bg-bg-surface rounded" />
            <div className="h-5 w-5 bg-bg-surface rounded" />
          </div>
        </div>
      </div>

      {/* Bio skeleton */}
      <div className="pb-4 border-b border-line-default space-y-2">
        <div className="h-4 w-full bg-bg-surface rounded" />
        <div className="h-4 w-3/4 bg-bg-surface rounded" />
      </div>

      {/* Latest section skeleton */}
      {[0, 1].map((i) => (
        <div key={i} className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <div className="h-5 w-32 bg-bg-surface rounded" />
            <div className="h-4 w-16 bg-bg-surface rounded" />
          </div>
          {[0, 1, 2].map((j) => (
            <div key={j} className="py-6 border-b border-line-default space-y-2">
              <div className="h-4 w-3/4 bg-bg-surface rounded" />
              <div className="h-3 w-full bg-bg-surface rounded" />
              <div className="flex gap-2 mt-2">
                <div className="h-3 w-20 bg-bg-surface rounded" />
                <div className="h-3 w-12 bg-bg-surface rounded" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
