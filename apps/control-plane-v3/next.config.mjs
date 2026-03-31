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
  eslint: {
    // 使用独立的 ESLint 配置，禁用 Next.js 内置的 ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
