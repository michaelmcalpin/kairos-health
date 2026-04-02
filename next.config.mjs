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
};

export default nextConfig;
