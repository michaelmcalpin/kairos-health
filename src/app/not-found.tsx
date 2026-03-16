import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-kairos-royal-dark flex items-center justify-center px-8">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <span className="text-8xl font-heading font-bold text-kairos-gold/20">404</span>
        </div>
        <h1 className="font-heading font-bold text-2xl text-white mb-3">Page Not Found</h1>
        <p className="font-body text-kairos-silver-dark mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="kairos-btn-gold text-sm px-6 py-3 text-center">
            Go to Dashboard
          </Link>
          <Link href="/" className="kairos-btn-outline text-sm px-6 py-3 text-center">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
