/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during Vercel builds — TypeScript type-checking still runs.
    // Run `npm run lint` locally to catch lint issues before pushing.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
