import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['katex'],
  experimental: {
    workerThreads: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
  },
  webpack(config) {
    // Limit parallelism to reduce Windows worker memory pressure
    config.parallelism = 2;
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
