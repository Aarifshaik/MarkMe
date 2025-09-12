/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/markme',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;