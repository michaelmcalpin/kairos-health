export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-kairos-royal">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-body text-sm text-kairos-silver-dark">Loading...</p>
      </div>
    </div>
  );
}
