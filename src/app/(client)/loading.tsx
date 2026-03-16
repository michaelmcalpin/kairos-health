export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-kairos-card rounded-kairos-sm" />
        <div className="h-4 w-32 bg-kairos-card rounded-kairos-sm" />
      </div>

      {/* KPI row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="kairos-card p-5">
            <div className="h-3 w-16 bg-kairos-card-hover rounded mb-3" />
            <div className="h-7 w-20 bg-kairos-card-hover rounded" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kairos-card p-6 h-64">
          <div className="h-5 w-32 bg-kairos-card-hover rounded mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-kairos-card-hover rounded" style={{ width: `${85 - i * 10}%` }} />
            ))}
          </div>
        </div>
        <div className="kairos-card p-6 h-64">
          <div className="h-5 w-40 bg-kairos-card-hover rounded mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 bg-kairos-card-hover rounded" style={{ width: `${90 - i * 15}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
