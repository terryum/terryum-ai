# Image Loading Strategy

## Pipeline Overview

```
posts/{research,idea}/<slug>/ko.mdx       (title source for thumbnail)
        │
        ▼  generate-thumbnails.mjs
public/posts/<slug>/cover-thumb.webp      (112×112 title-based, ~2-3KB)

posts/{research,idea}/<slug>/cover.webp   (source, gitignored in public/)
        │
        ▼  copy-post-images.mjs
public/posts/<slug>/cover.webp            (full-size, ~1200×675)
        │
        ▼  Next.js Image Optimization
/_next/image?url=...&w=...&q=75           (on-demand resize + format)
        │
        ▼  Cloudflare Worker → Cloudflare CDN → R2 public bucket
Cached response to client
```

## Build Scripts (order matters)

1. `clean-next.mjs` — removes `.next` cache
2. `copy-post-images.mjs` — copies images from `posts/` to `public/posts/`
3. `generate-thumbnails.mjs` — generates 112×112 title-based thumbnails from ko.mdx frontmatter
4. `next build` — builds the app (Next.js optimizes images on first request)

## Component Image Usage

| Component | Image | sizes | priority | Notes |
|-----------|-------|-------|----------|-------|
| `ContentCard` | `cover_thumb` (fallback: `cover_image`) | `112px` | No | List page thumbnail, 112×112 `object-cover` |
| `CoverImage` | `cover_image` | `(max-width: 768px) 100vw, 672px` | Yes (LCP) | Detail page cover, opens lightbox on click |
| `Figure` | figure src | `(max-width: 768px) 100vw, 672px` | No | Inline MDX figure, opens lightbox |
| `ImageLightbox` | item src | `(min-width: 1200px) 1200px, 90vw` | No | Modal, max 1200px/800px height |
| `ImageGallery` | gallery items | `256px` | No | Appendix thumbnails, opens lightbox |

## Thumbnail Auto-Detection

`normalizeMeta()` in `src/lib/posts.ts` auto-sets `cover_thumb` to `/posts/<slug>/cover-thumb.webp` when:
- No explicit `cover_thumb` is set in frontmatter/meta.json
- `cover_image` exists

`ContentCard` uses `post.cover_thumb || post.cover_image` — if the thumbnail file doesn't exist at runtime, Next.js will fall back gracefully (404 → broken image). The build pipeline ensures thumbnails are always generated before deploy.

## Caching Layers

1. **Next.js Image Cache** — `minimumCacheTTL: 86400` (24h), stored in `.next/cache/images/`
2. **Cloudflare Worker / R2 incremental cache** — OpenNext's `r2IncrementalCache` caches ISR + SSG HTML responses
3. **Cloudflare CDN** — fronts the Worker, caches `/_next/image` and static assets per `public/_headers`
4. **Static assets** (`/images/*`, `/fonts/*`, `/_next/static/*`) — `Cache-Control: public, max-age=31536000, immutable`

## Mobile Considerations

- `ContentCard` hides thumbnails on mobile (`hidden sm:block`) — no image requests on small screens
- Cover images use responsive `sizes` to avoid downloading oversized images on mobile
- Lightbox constrains to `90vw` / `75vh` on mobile, `1200px` / `800px` max on desktop
