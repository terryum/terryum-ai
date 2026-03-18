#!/usr/bin/env node

/**
 * sync-papers.mjs
 * Syncs meta.json files → Supabase papers table + auto-generates graph edges.
 *
 * Usage:
 *   node scripts/sync-papers.mjs              # sync all papers
 *   node scripts/sync-papers.mjs --slug=xxx   # sync single paper
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const PAPERS_DIR = path.join(POSTS_DIR, 'papers');

// ── Supabase client ──
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// ── CLI args ──
const args = process.argv.slice(2);
const slugArg = args.find(a => a.startsWith('--slug='))?.split('=')[1];
const autoTaxonomy = args.includes('--auto-taxonomy');

// ── Load taxonomy.json ──
async function loadTaxonomy() {
  try {
    const raw = await fs.readFile(path.join(POSTS_DIR, 'taxonomy.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    console.warn('⚠ Could not load taxonomy.json');
    return { version: 2, nodes: {} };
  }
}

// ── Validate taxonomy_primary against taxonomy.json ──
async function validateTaxonomy(papers, taxonomy) {
  const nodes = taxonomy.nodes || {};
  const missingTaxonomies = new Set();

  for (const paper of papers) {
    if (paper.taxonomy_primary && !nodes[paper.taxonomy_primary]) {
      missingTaxonomies.add(paper.taxonomy_primary);
      console.warn(`⚠ Paper "${paper.slug}" has taxonomy_primary "${paper.taxonomy_primary}" not in taxonomy.json`);
    }
  }

  if (missingTaxonomies.size === 0) return;

  if (autoTaxonomy) {
    console.log(`\n🔧 Auto-adding ${missingTaxonomies.size} missing taxonomy node(s)...`);
    for (const taxId of missingTaxonomies) {
      // Build node with label derived from ID
      const parts = taxId.split('/');
      const leafName = parts[parts.length - 1];
      const label = leafName.charAt(0).toUpperCase() + leafName.slice(1).replace(/-/g, ' ');

      nodes[taxId] = {
        label: { ko: label, en: label },
        children: [],
      };

      // Add to parent's children if parent exists
      if (parts.length > 1) {
        const parentId = parts.slice(0, -1).join('/');
        if (nodes[parentId]) {
          if (!nodes[parentId].children.includes(taxId)) {
            nodes[parentId].children.push(taxId);
          }
          console.log(`  + Added "${taxId}" under parent "${parentId}"`);
        } else {
          // Create intermediate parent nodes
          let currentPath = '';
          for (let i = 0; i < parts.length - 1; i++) {
            currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
            if (!nodes[currentPath]) {
              const pLabel = parts[i].charAt(0).toUpperCase() + parts[i].slice(1).replace(/-/g, ' ');
              nodes[currentPath] = {
                label: { ko: pLabel, en: pLabel },
                children: [],
              };
              console.log(`  + Created intermediate node "${currentPath}"`);
            }
          }
          // Wire up parent → child
          if (nodes[parentId]) {
            if (!nodes[parentId].children.includes(taxId)) {
              nodes[parentId].children.push(taxId);
            }
          }
          // Wire up root → first child if needed
          const rootId = parts[0];
          if (parts.length > 2 && nodes[rootId]) {
            const secondLevel = `${parts[0]}/${parts[1]}`;
            if (!nodes[rootId].children.includes(secondLevel)) {
              nodes[rootId].children.push(secondLevel);
            }
          }
          console.log(`  + Added "${taxId}" under new parent "${parentId}"`);
        }
      } else {
        console.log(`  + Added new top-level node "${taxId}"`);
      }
    }

    // Save updated taxonomy.json
    taxonomy.nodes = nodes;
    const taxPath = path.join(POSTS_DIR, 'taxonomy.json');
    await fs.writeFile(taxPath, JSON.stringify(taxonomy, null, 2) + '\n', 'utf-8');
    console.log(`✓ Updated taxonomy.json with ${missingTaxonomies.size} new node(s)`);
  } else {
    console.warn(`\n⚠ ${missingTaxonomies.size} taxonomy node(s) missing from taxonomy.json:`);
    for (const t of missingTaxonomies) {
      console.warn(`    - ${t}`);
    }
    console.warn('  Run with --auto-taxonomy to auto-add them.\n');
  }
}

// ── Check for top-level node proliferation ──
function checkTopLevelBalance(taxonomy) {
  const nodes = taxonomy.nodes || {};
  const topLevelNodes = Object.keys(nodes).filter(id => {
    if (id.includes('/')) return false;
    // It's a root if no other node lists it as a child
    return !Object.values(nodes).some(n => (n.children || []).includes(id));
  });

  if (topLevelNodes.length > 5) {
    console.warn(`\n⚠ Rebalancing warning: ${topLevelNodes.length} top-level taxonomy nodes detected (threshold: 5)`);
    console.warn('  Top-level nodes:', topLevelNodes.join(', '));
    console.warn('  Consider grouping related nodes under a common parent to keep the graph navigable.\n');
  } else {
    console.log(`✓ Top-level taxonomy balance OK (${topLevelNodes.length} nodes)`);
  }
}

// ── Read frontmatter title ──
async function readFrontmatterTitle(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return null;
    const titleMatch = match[1].match(/^title:\s*"?(.+?)"?\s*$/m);
    return titleMatch ? titleMatch[1] : null;
  } catch {
    return null;
  }
}

// ── Collect papers from filesystem ──
async function collectPapers(filterSlug) {
  const papers = [];
  let entries;
  try {
    entries = await fs.readdir(PAPERS_DIR, { withFileTypes: true });
  } catch {
    console.error('❌ Cannot read papers directory');
    process.exit(1);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    if (filterSlug && slug !== filterSlug) continue;

    const metaPath = path.join(PAPERS_DIR, slug, 'meta.json');
    let meta;
    try {
      const raw = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(raw);
    } catch {
      console.warn(`⚠ Skipping ${slug}: no valid meta.json`);
      continue;
    }

    const titleEn = await readFrontmatterTitle(path.join(PAPERS_DIR, slug, 'en.mdx'))
      || meta.source_title || slug;
    const titleKo = await readFrontmatterTitle(path.join(PAPERS_DIR, slug, 'ko.mdx'))
      || meta.source_title || slug;

    papers.push({
      slug: meta.slug || slug,
      title_en: titleEn,
      title_ko: titleKo,
      domain: meta.domain || null,
      taxonomy_primary: meta.taxonomy_primary || null,
      taxonomy_secondary: meta.taxonomy_secondary || [],
      key_concepts: meta.key_concepts || [],
      methodology: meta.methodology || [],
      contribution_type: meta.contribution_type || null,
      source_author: meta.source_author || null,
      source_date: meta.source_date || null,
      published_at: meta.published_at || null,
      meta_json: meta,
      relations: meta.relations || [],
    });
  }

  return papers;
}

// ── Upsert papers ──
async function upsertPapers(papers) {
  const rows = papers.map(p => ({
    slug: p.slug,
    title_en: p.title_en,
    title_ko: p.title_ko,
    domain: p.domain,
    taxonomy_primary: p.taxonomy_primary,
    taxonomy_secondary: p.taxonomy_secondary,
    key_concepts: p.key_concepts,
    methodology: p.methodology,
    contribution_type: p.contribution_type,
    source_author: p.source_author,
    source_date: p.source_date,
    published_at: p.published_at,
    meta_json: p.meta_json,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('papers')
    .upsert(rows, { onConflict: 'slug' });

  if (error) {
    console.error('❌ Failed to upsert papers:', error.message);
    process.exit(1);
  }

  console.log(`✓ Upserted ${rows.length} papers`);
}

// ── Sync edges from meta.json relations ──
async function syncMetaEdges(papers) {
  // Get all existing paper slugs from DB for validation
  const { data: existingPapers } = await supabase
    .from('papers')
    .select('slug');
  const validSlugs = new Set((existingPapers || []).map(p => p.slug));

  const edges = [];
  for (const paper of papers) {
    for (const rel of paper.relations) {
      if (!validSlugs.has(rel.target)) {
        console.warn(`⚠ Skipping edge ${paper.slug} → ${rel.target}: target not found`);
        continue;
      }
      const edgeId = `${paper.slug}__${rel.target}__${rel.type}`;
      edges.push({
        edge_id: edgeId,
        source_slug: paper.slug,
        target_slug: rel.target,
        edge_type: rel.type,
        provenance: 'meta',
        status: 'confirmed',
        weight: 0.7,
        detail: `From meta.json relations`,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (edges.length > 0) {
    const { error } = await supabase
      .from('graph_edges')
      .upsert(edges, { onConflict: 'edge_id' });

    if (error) {
      console.error('❌ Failed to upsert meta edges:', error.message);
    } else {
      console.log(`✓ Upserted ${edges.length} meta edges`);
    }
  }

  return edges.length;
}

// ── Auto-generate suggested edges ──
async function generateAutoEdges(papers) {
  // Get ALL papers from DB for cross-referencing
  const { data: allPapers } = await supabase
    .from('papers')
    .select('slug, taxonomy_primary, key_concepts, methodology');

  if (!allPapers || allPapers.length === 0) return 0;

  // Get existing non-suggested edges to avoid overwriting admin decisions
  const { data: existingEdges } = await supabase
    .from('graph_edges')
    .select('edge_id, status')
    .in('status', ['confirmed', 'rejected']);

  const preservedEdgeIds = new Set((existingEdges || []).map(e => e.edge_id));

  const autoEdges = [];
  const papersToCheck = papers.length > 0 ? papers : allPapers;

  for (const paper of papersToCheck) {
    const p = allPapers.find(ap => ap.slug === paper.slug);
    if (!p) continue;

    for (const other of allPapers) {
      if (other.slug === p.slug) continue;

      // Rule 1: same taxonomy_primary → same_field
      if (p.taxonomy_primary && p.taxonomy_primary === other.taxonomy_primary) {
        const edgeId = `${p.slug}__${other.slug}__same_field`;
        if (!preservedEdgeIds.has(edgeId)) {
          autoEdges.push({
            edge_id: edgeId,
            source_slug: p.slug,
            target_slug: other.slug,
            edge_type: 'same_field',
            provenance: 'auto',
            status: 'suggested',
            weight: 0.3,
            detail: `Same taxonomy: ${p.taxonomy_primary}`,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Rule 2: key_concepts overlap >= 2 → shared_concepts
      const sharedConcepts = (p.key_concepts || []).filter(
        c => (other.key_concepts || []).includes(c)
      );
      if (sharedConcepts.length >= 2) {
        const edgeId = `${p.slug}__${other.slug}__shared_concepts`;
        if (!preservedEdgeIds.has(edgeId)) {
          autoEdges.push({
            edge_id: edgeId,
            source_slug: p.slug,
            target_slug: other.slug,
            edge_type: 'shared_concepts',
            provenance: 'auto',
            status: 'suggested',
            weight: Math.min(0.3 + sharedConcepts.length * 0.1, 1.0),
            detail: `Shared concepts: ${sharedConcepts.join(', ')}`,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Rule 3: methodology overlap >= 1 → shared_method
      const sharedMethods = (p.methodology || []).filter(
        m => (other.methodology || []).includes(m)
      );
      if (sharedMethods.length >= 1) {
        const edgeId = `${p.slug}__${other.slug}__shared_method`;
        if (!preservedEdgeIds.has(edgeId)) {
          autoEdges.push({
            edge_id: edgeId,
            source_slug: p.slug,
            target_slug: other.slug,
            edge_type: 'shared_method',
            provenance: 'auto',
            status: 'suggested',
            weight: 0.4,
            detail: `Shared methods: ${sharedMethods.join(', ')}`,
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Deduplicate (A→B and B→A for same type → keep only one)
  const seen = new Set();
  const dedupedEdges = autoEdges.filter(e => {
    const reverseId = `${e.target_slug}__${e.source_slug}__${e.edge_type}`;
    if (seen.has(e.edge_id) || seen.has(reverseId)) return false;
    seen.add(e.edge_id);
    return true;
  });

  if (dedupedEdges.length > 0) {
    const { error } = await supabase
      .from('graph_edges')
      .upsert(dedupedEdges, { onConflict: 'edge_id' });

    if (error) {
      console.error('❌ Failed to upsert auto edges:', error.message);
    } else {
      console.log(`✓ Upserted ${dedupedEdges.length} auto-suggested edges`);
    }
  }

  return dedupedEdges.length;
}

// ── Generate initial layout coordinates ──
async function generateLayouts(papers) {
  // Group by taxonomy_primary for spatial clustering
  const groups = {};
  for (const p of papers) {
    const group = p.taxonomy_primary || 'other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(p.slug);
  }

  const layouts = [];
  let groupIdx = 0;

  for (const [, slugs] of Object.entries(groups)) {
    const cx = 300 + groupIdx * 400;
    const cy = 200;

    for (let i = 0; i < slugs.length; i++) {
      const angle = (2 * Math.PI * i) / Math.max(slugs.length, 1);
      const radius = 120 + slugs.length * 15;
      layouts.push({
        slug: slugs[i],
        view_id: 'default',
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        pinned: false,
      });
    }
    groupIdx++;
  }

  if (layouts.length > 0) {
    // Only insert if not already pinned
    const { data: existing } = await supabase
      .from('node_layouts')
      .select('slug, pinned')
      .eq('view_id', 'default')
      .eq('pinned', true);

    const pinnedSlugs = new Set((existing || []).map(e => e.slug));
    const newLayouts = layouts.filter(l => !pinnedSlugs.has(l.slug));

    if (newLayouts.length > 0) {
      const { error } = await supabase
        .from('node_layouts')
        .upsert(newLayouts, { onConflict: 'slug,view_id' });

      if (error) {
        console.error('❌ Failed to upsert layouts:', error.message);
      } else {
        console.log(`✓ Upserted ${newLayouts.length} node layouts`);
      }
    }
  }
}

// ── Main ──
async function main() {
  console.log('🔄 Syncing papers to Supabase...');

  const papers = await collectPapers(slugArg);
  if (papers.length === 0) {
    console.log('No papers found to sync.');
    return;
  }

  // Step 0: Load and validate taxonomy
  const taxonomy = await loadTaxonomy();
  await validateTaxonomy(papers, taxonomy);

  // Step 1: Upsert papers
  await upsertPapers(papers);

  // Step 2: Sync meta.json relations as confirmed edges
  const metaEdgeCount = await syncMetaEdges(papers);

  // Step 3: Generate auto-suggested edges
  const autoEdgeCount = await generateAutoEdges(papers);

  // Step 4: Generate initial layout coordinates
  await generateLayouts(papers);

  // Step 5: Check top-level taxonomy balance
  const freshTaxonomy = await loadTaxonomy();
  checkTopLevelBalance(freshTaxonomy);

  console.log(`\n✅ Sync complete: ${papers.length} papers, ${metaEdgeCount} meta edges, ${autoEdgeCount} auto edges`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
