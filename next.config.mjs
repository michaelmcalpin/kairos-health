/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during Vercel builds.
    // Run `npm run lint` locally to catch lint issues before pushing.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
