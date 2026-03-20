export default function CompanyLoading() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 bg-kairos-card border-r border-kairos-border animate-pulse" />
      <div className="flex-1 ml-64">
        <div className="h-16 bg-kairos-card border-b border-kairos-border animate-pulse" />
        <div className="p-6 space-y-6">
          <div className="h-8 bg-kairos-card rounded-kairos-sm w-64 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 bg-kairos-card rounded-kairos-sm animate-pulse" />
            ))}
          </div>
          <div className="h-96 bg-kairos-card rounded-kairos-sm animate-pulse" />
        </div>
      </div>
    </div>
  );
}
