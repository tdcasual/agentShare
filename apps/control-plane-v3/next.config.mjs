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
  // Next.js build-time ESLint detection does not recognize ESLint 9 flat config
  // (eslint.config.mjs). We run `npm run lint` in CI, so disabling build-time
  // checks avoids the false-positive plugin-missing warning.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
