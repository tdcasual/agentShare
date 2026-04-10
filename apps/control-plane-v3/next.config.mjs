/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  // ESLint is run via CI and npm scripts; keep Next.js build-time checks enabled
  // for additional safety net.
};

export default nextConfig;
