/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during Vercel builds.
    // Run `npm run lint` locally to catch lint issues before pushing.
    ignoreDuringBuilds: true,
  },

  // ─── Image Optimization ──────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "*.clerk.dev" },
    ],
  },

  // ─── Compression ─────────────────────────────────────────────────────
  compress: true,

  // ─── Powered-by header ───────────────────────────────────────────────
  poweredByHeader: false,

  // ─── Production source maps (for error tracking) ─────────────────────
  productionBrowserSourceMaps: false,

  // ─── Strict mode ─────────────────────────────────────────────────────
  reactStrictMode: true,

  // ─── Logging ─────────────────────────────────────────────────────────
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // ─── Security headers ────────────────────────────────────────────────
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
