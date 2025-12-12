/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for GitHub Pages deployment
  output: 'export',
  
  basePath: '/markme',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  
  // Fix for socket.io-client optional dependencies
  webpack: (config) => {
    config.externals.push({
      bufferutil: 'bufferutil',
      'utf-8-validate': 'utf-8-validate',
    });
    return config;
  },
};

module.exports = nextConfig;