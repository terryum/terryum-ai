import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow only major search engines
      {
        userAgent: ['Googlebot', 'Bingbot', 'Yeti', 'DuckDuckBot'],
        allow: '/',
      },
      // Block AI crawlers and scrapers
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'Google-Extended',
          'anthropic-ai',
          'ClaudeBot',
          'Claude-Web',
          'Bytespider',
          'PerplexityBot',
          'Cohere-ai',
          'FacebookBot',
          'Meta-ExternalAgent',
          'Applebot-Extended',
          'Omgilibot',
          'Diffbot',
          'ImagesiftBot',
          'Amazonbot',
        ],
        disallow: '/',
      },
      // Block all other bots by default
      {
        userAgent: '*',
        disallow: '/',
      },
    ],
  };
}
