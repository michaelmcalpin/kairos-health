export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-56 bg-kairos-card rounded-kairos-sm" />
        <div className="h-4 w-36 bg-kairos-card rounded-kairos-sm" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kairos-card p-5">
            <div className="h-3 w-20 bg-kairos-card-hover rounded mb-3" />
            <div className="h-7 w-16 bg-kairos-card-hover rounded" />
          </div>
        ))}
      </div>
      <div className="kairos-card p-6 h-80">
        <div className="h-5 w-40 bg-kairos-card-hover rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-kairos-card-hover" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-kairos-card-hover rounded w-3/4" />
                <div className="h-3 bg-kairos-card-hover rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
