export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-52 bg-kairos-card rounded-kairos-sm" />
        <div className="h-4 w-40 bg-kairos-card rounded-kairos-sm" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="kairos-card p-5">
            <div className="h-3 w-16 bg-kairos-card-hover rounded mb-3" />
            <div className="h-6 w-20 bg-kairos-card-hover rounded" />
          </div>
        ))}
      </div>
      <div className="kairos-card p-6 h-72">
        <div className="h-5 w-48 bg-kairos-card-hover rounded mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-kairos-card-hover rounded" style={{ width: `${95 - i * 8}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
