#!/usr/bin/env node

/**
 * generate-index.mjs
 * Reads all posts/meta.json files and generates posts/index.json
 * — a central index for AI memory / cross-referencing.
 *
 * Usage: node scripts/generate-index.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const CATEGORIES = ['papers', 'notes', 'tech', 'essays'];

async function readFrontmatter(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const match = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const yaml = match[1];
    const result = {};
    for (const line of yaml.split('\n')) {
      const m = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
      if (m) result[m[1]] = m[2];
    }
    return result;
  } catch {
    return {};
  }
}

async function collectPosts() {
  const posts = [];

  for (const cat of CATEGORIES) {
    const catDir = path.join(POSTS_DIR, cat);
    let entries;
    try {
      entries = await fs.readdir(catDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const metaPath = path.join(catDir, slug, 'meta.json');

      let meta;
      try {
        const raw = await fs.readFile(metaPath, 'utf-8');
        meta = JSON.parse(raw);
      } catch {
        continue;
      }

      // Read titles from frontmatter
      const koFm = await readFrontmatter(path.join(catDir, slug, 'ko.mdx'));
      const enFm = await readFrontmatter(path.join(catDir, slug, 'en.mdx'));

      posts.push({
        post_number: meta.post_number ?? null,
        slug: meta.slug || slug,
        content_type: meta.content_type || cat,
        title_en: enFm.title || meta.source_title || slug,
        title_ko: koFm.title || meta.source_title || slug,
        domain: meta.domain || null,
        subfields: meta.subfields || [],
        key_concepts: meta.key_concepts || [],
        methodology: meta.methodology || [],
        contribution_type: meta.contribution_type || null,
        tags: meta.tags || [],
        source_author: meta.source_author || null,
        source_date: meta.source_date || null,
        published_at: meta.published_at || null,
        citation_count: meta.citation_count ?? null,
        ai_summary: meta.ai_summary || null,
        relations: meta.relations || [],
        idea_status: meta.idea_status || null,
        related_posts: meta.related_posts || null,
        taxonomy_primary: meta.taxonomy_primary || null,
        taxonomy_secondary: meta.taxonomy_secondary || [],
      });
    }
  }

  // Sort by post_number
  posts.sort((a, b) => (a.post_number ?? 9999) - (b.post_number ?? 9999));
  return posts;
}

function buildKnowledgeGraph(posts) {
  const edges = [];
  for (const post of posts) {
    for (const rel of post.relations || []) {
      edges.push({
        from: post.slug,
        to: rel.target,
        type: rel.type,
      });
    }
  }

  // Build clusters from taxonomy_primary groups
  const taxonomyGroups = {};
  for (const post of posts) {
    if (!post.taxonomy_primary) continue;
    if (!taxonomyGroups[post.taxonomy_primary]) {
      taxonomyGroups[post.taxonomy_primary] = [];
    }
    if (post.post_number != null) {
      taxonomyGroups[post.taxonomy_primary].push(post.post_number);
    }
  }

  // Also cluster by shared key_concepts (3+ overlap → same cluster)
  const conceptGroups = {};
  for (const post of posts) {
    for (const concept of post.key_concepts || []) {
      if (!conceptGroups[concept]) conceptGroups[concept] = [];
      if (post.post_number != null) {
        conceptGroups[concept].push(post.post_number);
      }
    }
  }

  // Find shared concepts clusters (concept shared by 3+ papers)
  const conceptClusters = {};
  for (const [concept, nums] of Object.entries(conceptGroups)) {
    if (nums.length >= 3) {
      // Group by top taxonomy node of the concept's papers
      const clusterKey = `concept-${concept}`;
      conceptClusters[clusterKey] = {
        id: clusterKey,
        label: concept,
        post_numbers: [...new Set(nums)].sort((a, b) => a - b),
        core_concepts: [concept],
        taxonomy_nodes: [],
      };
    }
  }

  // Build taxonomy-based clusters
  const clusters = [];
  for (const [taxNode, nums] of Object.entries(taxonomyGroups)) {
    if (nums.length >= 2) {
      // Find core concepts shared by 2+ papers in this cluster
      const clusterPosts = posts.filter(p => nums.includes(p.post_number));
      const conceptCounts = {};
      for (const p of clusterPosts) {
        for (const c of p.key_concepts || []) {
          conceptCounts[c] = (conceptCounts[c] || 0) + 1;
        }
      }
      const coreConcepts = Object.entries(conceptCounts)
        .filter(([, count]) => count >= 2)
        .map(([c]) => c);

      clusters.push({
        id: taxNode.replace('/', '-'),
        label: taxNode,
        post_numbers: nums.sort((a, b) => a - b),
        core_concepts: coreConcepts,
        taxonomy_nodes: [taxNode],
      });
    }
  }

  // Add significant concept clusters not covered by taxonomy clusters
  for (const cluster of Object.values(conceptClusters)) {
    const alreadyCovered = clusters.some(c =>
      cluster.post_numbers.every(n => c.post_numbers.includes(n))
    );
    if (!alreadyCovered) {
      clusters.push(cluster);
    }
  }

  // Identify bridge papers: has taxonomy_secondary that links to a different cluster
  const bridgePapers = [];
  for (const post of posts) {
    if (!post.post_number) continue;
    const hasSecondary = (post.taxonomy_secondary || []).length > 0;
    if (hasSecondary && post.taxonomy_primary) {
      // Bridge if secondary taxonomy also has a cluster
      const secondaryHasCluster = (post.taxonomy_secondary || []).some(sec =>
        clusters.some(c => c.taxonomy_nodes.includes(sec))
      );
      if (secondaryHasCluster) {
        bridgePapers.push(post.post_number);
      }
    }
  }

  // Identify outlier papers: no taxonomy_primary or taxonomy_primary not in any cluster
  const outlierPapers = [];
  for (const post of posts) {
    if (!post.post_number || post.content_type !== 'papers') continue;
    if (!post.taxonomy_primary) {
      outlierPapers.push(post.post_number);
      continue;
    }
    const inCluster = clusters.some(c => c.post_numbers.includes(post.post_number));
    if (!inCluster) {
      outlierPapers.push(post.post_number);
    }
  }

  return { edges, clusters, bridge_papers: bridgePapers, outlier_papers: outlierPapers };
}

function buildConceptIndex(posts) {
  const index = {};
  for (const post of posts) {
    for (const concept of post.key_concepts || []) {
      if (!index[concept]) index[concept] = [];
      if (post.post_number != null) {
        index[concept].push(post.post_number);
      }
    }
  }
  // Sort arrays
  for (const key of Object.keys(index)) {
    index[key].sort((a, b) => a - b);
  }
  return index;
}

function buildDomainStats(posts) {
  const stats = {};
  for (const post of posts) {
    if (post.domain) {
      stats[post.domain] = (stats[post.domain] || 0) + 1;
    }
  }
  return stats;
}

function buildTaxonomyStats(posts) {
  const stats = {};
  for (const post of posts) {
    if (post.taxonomy_primary) {
      stats[post.taxonomy_primary] = (stats[post.taxonomy_primary] || 0) + 1;
    }
    for (const sec of post.taxonomy_secondary || []) {
      // Count secondary with 0.5 weight (just for reference, stored separately)
      const key = `${sec}:secondary`;
      stats[key] = (stats[key] || 0) + 1;
    }
  }
  return stats;
}

async function main() {
  const posts = await collectPosts();

  const index = {
    generated_at: new Date().toISOString(),
    total_posts: posts.length,
    posts,
    knowledge_graph: buildKnowledgeGraph(posts),
    concept_index: buildConceptIndex(posts),
    domain_stats: buildDomainStats(posts),
    taxonomy_stats: buildTaxonomyStats(posts),
  };

  const outPath = path.join(POSTS_DIR, 'index.json');
  await fs.writeFile(outPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  console.log(`✓ Generated ${outPath} (${posts.length} posts)`);

  // Print summary
  const kg = index.knowledge_graph;
  console.log(`  edges: ${kg.edges.length}, clusters: ${kg.clusters.length}, bridge: ${kg.bridge_papers.length}, outliers: ${kg.outlier_papers.length}`);
  console.log('  taxonomy_stats:', JSON.stringify(index.taxonomy_stats, null, 2));
}

main().catch((err) => {
  console.error('Failed to generate index:', err);
  process.exit(1);
});
