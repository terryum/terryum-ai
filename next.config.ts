import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  serverExternalPackages: ['katex'],
  outputFileTracingIncludes: {
    '*': [
      './posts/**/*.json',
      './posts/**/*.mdx',
      './posts/**/*.md',
      './projects/**/*.json',
      './content/**/*.mdx',
      './content/**/*.md',
      './content.config.json',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },
  webpack(config, { dev }) {
    // Limit parallelism to reduce Windows worker memory pressure
    config.parallelism = 2;
    // Use in-memory cache in dev to prevent OneDrive/filesystem cache corruption
    // that causes recurring 500 errors
    if (dev) {
      config.cache = { type: 'memory' };
    }
    // Allow `import foo from '...mdx?raw'` to return file contents as string.
    // Needed for Cloudflare Workers where fs.readFile on arbitrary paths is unreliable.
    config.module.rules.push({
      test: /\.(mdx|md)$/,
      resourceQuery: /raw/,
      type: 'asset/source',
    });
    return config;
  },
  async redirects() {
    return [
      // Index page redirects
      { source: '/:locale/research', destination: '/:locale/posts?tab=papers', permanent: true },
      { source: '/:locale/ideas', destination: '/:locale/posts?tab=tech', permanent: true },
      { source: '/:locale/essays', destination: '/:locale/posts?tab=essays', permanent: true },
      // Detail page redirects
      { source: '/:locale/research/:slug', destination: '/:locale/posts/:slug', permanent: true },
      { source: '/:locale/ideas/:slug', destination: '/:locale/posts/:slug', permanent: true },
      { source: '/:locale/essays/:slug', destination: '/:locale/posts/:slug', permanent: true },
    ];
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

initOpenNextCloudflareForDev();
