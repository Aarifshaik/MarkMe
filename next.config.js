/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/MarkMe',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;