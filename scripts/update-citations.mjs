/**
 * Update citation counts for research posts.
 *
 * SOURCE: Google Scholar ONLY (no Semantic Scholar API).
 * Method: Playwright (Chromium headless) → search by sanitized source_title
 *         → read "Cited by N" from first result.
 *
 * ⚠ DO NOT switch to Semantic Scholar API or any other source.
 *   The only allowed change is improving how the Google Scholar search URL is built.
 *
 * Usage: node scripts/update-citations.mjs
 *
 * Retry policy:
 *   - citation_status === 'failed'  → always retry (daily)
 *   - citation_manual === true      → always retry (to upgrade manual value to real data)
 *   - citation_status === 'ok'      → skip if updated within 6 days (effectively weekly)
 *   - no citation_updated_at        → always crawl (new entry)
 *
 *   On success: update citation_count, set citation_status='ok', clear citation_manual
 *   On failure with citation_manual: keep manual value, leave citation_status='manual'
 *   On failure without manual:       set citation_status='failed', keep old citation_count
 */

import fs from 'fs/promises';
import path from 'path';

const RESEARCH_DIR = path.join(process.cwd(), 'posts', 'research');
const SKIP_IF_OK_WITHIN_DAYS = 6;

/**
 * Remove Greek letters (U+0370-U+03FF) and subscript/superscript chars (U+2070-U+209F)
 * from a title, then drop any tokens that have no word characters left.
 * e.g. "π₀.₆: a VLA That Learns From Experience"  → "a VLA That Learns From Experience"
 *      "π₀: A Vision-Language-Action Flow Model…"  → "A Vision-Language-Action Flow Model…"
 */
function sanitizeTitle(title) {
  return title
    .replace(/[\u0370-\u03FF\u2070-\u209F]/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 0 && /\w/.test(token))
    .join(' ')
    .trim();
}

function buildScholarUrl(title) {
  const cleaned = sanitizeTitle(title);
  return `https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=${encodeURIComponent(cleaned).replace(/%20/g, '+')}&btnG=`;
}

/**
 * Returns true if this post should be crawled this run.
 * Skips posts that were successfully crawled within SKIP_IF_OK_WITHIN_DAYS days.
 */
function shouldCrawl(meta) {
  if (!meta.citation_updated_at) return true;
  if (meta.citation_manual) return true;
  if (meta.citation_status === 'failed') return true;
  if (meta.citation_status !== 'ok') return true;

  const updatedAt = new Date(meta.citation_updated_at);
  const daysSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= SKIP_IF_OK_WITHIN_DAYS;
}

async function fetchCitationFromGoogleScholar(scholarUrl) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(scholarUrl, { waitUntil: 'domcontentloaded' });

    const citedByText = await page
      .locator('.gs_ri')
      .first()
      .locator('a', { hasText: /Cited by \d+/ })
      .textContent({ timeout: 10000 });

    const match = citedByText.match(/\d[\d,]*/);
    if (!match) return null;
    return parseInt(match[0].replace(/,/g, ''), 10);
  } catch {
    return null;
  } finally {
    await browser.close();
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const entries = await fs.readdir(RESEARCH_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const slug of dirs) {
    const metaPath = path.join(RESEARCH_DIR, slug, 'meta.json');
    let meta;
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(raw);
    } catch {
      console.log(`  SKIP ${slug}: no meta.json`);
      skipped++;
      continue;
    }

    // Build Scholar URL from stored override or auto-generate from sanitized title
    const scholarUrl =
      meta.google_scholar_url || (meta.source_title ? buildScholarUrl(meta.source_title) : null);

    if (!scholarUrl) {
      console.log(`  SKIP ${slug}: no source_title or google_scholar_url`);
      skipped++;
      continue;
    }

    if (!shouldCrawl(meta)) {
      console.log(`  SKIP ${slug}: recently updated (status=ok)`);
      skipped++;
      continue;
    }

    console.log(`  Fetching ${slug} from Google Scholar... [status=${meta.citation_status ?? 'none'}, manual=${!!meta.citation_manual}]`);
    const count = await fetchCitationFromGoogleScholar(scholarUrl);
    const now = new Date().toISOString();

    if (count != null) {
      console.log(`    → ${count} citations [Google Scholar]`);
      meta.citation_count = count;
      meta.citation_status = 'ok';
      meta.citation_updated_at = now;
      delete meta.citation_manual;
      updated++;
    } else {
      if (meta.citation_manual) {
        // Keep manual value; don't change citation_status
        console.log(`    Crawl failed — keeping manual value (${meta.citation_count})`);
      } else {
        // No manual fallback — mark as failed ("00" in UI)
        console.log(`    Crawl failed — marking as failed (UI shows "00")`);
        meta.citation_status = 'failed';
        meta.citation_updated_at = now;
      }
      failed++;
    }

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
    await sleep(2000 + Math.random() * 1000);
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed, ${skipped} skipped`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
