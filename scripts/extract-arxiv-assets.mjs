#!/usr/bin/env node

/**
 * Extract figure/table screenshots and clean captions from arXiv HTML in one
 * browser session.
 *
 * Usage:
 *   node scripts/extract-arxiv-assets.mjs 2607.05391 --out=/tmp/assets
 *   node scripts/extract-arxiv-assets.mjs --url=https://arxiv.org/html/2607.05391v2 --out=/tmp/assets
 */

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const value = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const positional = args.find((arg) => !arg.startsWith('--'));
const inputUrl = value('url');
const outDir = value('out');
const requestedId = positional || value('arxiv-id') || inputUrl?.match(/(?:abs|html|pdf)\/([^/?#]+)/)?.[1];

if (!requestedId || !outDir) {
  console.error('Usage: node scripts/extract-arxiv-assets.mjs <arxiv-id> --out=<directory> [--url=<arxiv-html-url>]');
  process.exit(2);
}

const arxivId = requestedId.replace(/\.pdf$/i, '');
const url = inputUrl
  ? inputUrl.replace('/abs/', '/html/').replace('/pdf/', '/html/').replace(/\.pdf(?=$|[?#])/, '')
  : `https://arxiv.org/html/${arxivId}`;

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);
  return candidates.find((candidate) => fsSync.existsSync(candidate));
}

async function captionText(locator) {
  if (await locator.count() === 0) return '';
  return locator.evaluate((node) => {
    const clone = node.cloneNode(true);
    for (const math of clone.querySelectorAll('math')) {
      math.replaceWith(math.getAttribute('alttext') || math.getAttribute('aria-label') || '');
    }
    for (const hidden of clone.querySelectorAll('[aria-hidden="true"], annotation, .ltx_MathML')) {
      hidden.remove();
    }
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  });
}

const startedAt = Date.now();
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(chromeExecutable() ? { executablePath: chromeExecutable() } : {}),
});

try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1400 }, deviceScaleFactor: 1.5 });
  const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
  if (!response?.ok()) throw new Error(`arXiv HTML returned HTTP ${response?.status() ?? 'unknown'}`);

  await page.addStyleTag({ content: `
    body { background: white !important; }
    figure.ltx_table { background: white !important; padding: 12px !important; margin: 0 !important; }
    figure.ltx_table figcaption { display: none !important; }
  ` });

  const manifest = {
    arxiv_id: arxivId,
    source_url: url,
    figures: [],
    tables: [],
  };

  const seenFigures = new Set();
  const figures = page.locator('figure.ltx_figure');
  for (let i = 0; i < await figures.count(); i += 1) {
    const figure = figures.nth(i);
    const nested = await figure.evaluate((node) => Boolean(node.parentElement?.closest('figure.ltx_figure')));
    if (nested) continue;
    const id = await figure.getAttribute('id');
    const match = id?.match(/\.F(\d+)$/);
    if (!match) continue;
    const number = Number(match[1]);
    if (seenFigures.has(number)) continue;
    const image = figure.locator('img.ltx_graphics').first();
    if (await image.count() === 0) continue;
    const caption = await captionText(figure.locator('figcaption').first());
    await image.scrollIntoViewIfNeeded();
    await image.screenshot({ path: path.join(outDir, `fig-${number}.png`) });
    manifest.figures.push({ number, src: `./fig-${number}.png`, caption });
    seenFigures.add(number);
  }

  const seenTables = new Set();
  const tables = page.locator('figure.ltx_table');
  for (let i = 0; i < await tables.count(); i += 1) {
    const table = tables.nth(i);
    const id = await table.getAttribute('id');
    const match = id?.match(/\.T(\d+)$/);
    if (!match) continue;
    const number = Number(match[1]);
    if (seenTables.has(number)) continue;
    const caption = await captionText(table.locator('figcaption').first());
    await table.scrollIntoViewIfNeeded();
    await table.screenshot({ path: path.join(outDir, `tab-${number}.png`) });
    manifest.tables.push({ number, src: `./tab-${number}.png`, caption });
    seenTables.add(number);
  }

  manifest.figures.sort((a, b) => a.number - b.number);
  manifest.tables.sort((a, b) => a.number - b.number);
  manifest.duration_ms = Date.now() - startedAt;
  await fs.writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    arxiv_id: arxivId,
    figures: manifest.figures.length,
    tables: manifest.tables.length,
    duration_ms: manifest.duration_ms,
    manifest: path.join(outDir, 'manifest.json'),
  }));
} catch (error) {
  console.error(`Asset extraction failed: ${error.message}`);
  console.error('If arXiv HTML is unavailable, use scripts/extract-paper-pdf.py as the fallback and verify numbering manually.');
  process.exitCode = 1;
} finally {
  await browser.close();
}
