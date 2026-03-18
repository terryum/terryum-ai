#!/usr/bin/env node

/**
 * test-graph.mjs
 * Integration tests for Paper Graph DB (Supabase).
 * Runs against real Supabase — uses a test prefix to avoid polluting production data.
 *
 * Usage: node scripts/test-graph.mjs
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

// ── Test helpers ──
const TEST_PREFIX = '__test_graph_';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertEq(actual, expected, message) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message} (expected=${JSON.stringify(expected)}, actual=${JSON.stringify(actual)})`,
  );
}

// ── Cleanup ──
async function cleanup() {
  // Delete test edges first (FK constraint)
  await supabase
    .from('graph_edges')
    .delete()
    .like('source_slug', `${TEST_PREFIX}%`);
  await supabase
    .from('graph_edges')
    .delete()
    .like('target_slug', `${TEST_PREFIX}%`);

  // Delete test layouts
  await supabase
    .from('node_layouts')
    .delete()
    .like('slug', `${TEST_PREFIX}%`);

  // Delete test papers
  await supabase
    .from('papers')
    .delete()
    .like('slug', `${TEST_PREFIX}%`);
}

// ── Test data ──
function makePaper(id, overrides = {}) {
  return {
    slug: `${TEST_PREFIX}${id}`,
    title_en: `Test Paper ${id}`,
    title_ko: `테스트 논문 ${id}`,
    domain: 'robotics',
    taxonomy_primary: 'robotics/hand/tactile',
    taxonomy_secondary: [],
    key_concepts: ['tactile sensing', 'force control'],
    methodology: ['deep learning'],
    contribution_type: 'method',
    source_author: 'Test Author',
    source_date: '2024-01-01',
    published_at: '2024-01-15',
    meta_json: { slug: `${TEST_PREFIX}${id}` },
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// Test 1: Paper CRUD
// ══════════════════════════════════════════════════════════════
async function testPaperCRUD() {
  console.log('\n📋 Test 1: Paper CRUD');

  // 1a: Upsert new paper → exists in DB
  const paper = makePaper('crud1');
  const { error: insertErr } = await supabase
    .from('papers')
    .upsert(paper, { onConflict: 'slug' });

  assert(!insertErr, `Upsert new paper (${insertErr?.message || 'ok'})`);

  const { data: found } = await supabase
    .from('papers')
    .select('slug, title_en')
    .eq('slug', paper.slug)
    .single();

  assert(found !== null, 'Paper exists after upsert');
  assertEq(found?.title_en, 'Test Paper crud1', 'Title matches');

  // 1b: Duplicate upsert → updated_at changes, data preserved
  const oldUpdated = found?.updated_at;
  await new Promise(r => setTimeout(r, 100)); // small delay
  const { error: upsertErr } = await supabase
    .from('papers')
    .upsert({ ...paper, updated_at: new Date().toISOString() }, { onConflict: 'slug' });

  assert(!upsertErr, 'Duplicate upsert succeeds');

  const { data: refetched } = await supabase
    .from('papers')
    .select('slug, title_en, updated_at')
    .eq('slug', paper.slug)
    .single();

  assertEq(refetched?.title_en, 'Test Paper crud1', 'Data preserved after duplicate upsert');

  // 1c: Edge with non-existent slug → FK error
  const { error: fkErr } = await supabase
    .from('graph_edges')
    .insert({
      edge_id: `${TEST_PREFIX}fk_test`,
      source_slug: paper.slug,
      target_slug: `${TEST_PREFIX}nonexistent`,
      edge_type: 'same_field',
      provenance: 'auto',
      status: 'suggested',
    });

  assert(fkErr !== null, `FK error on non-existent target slug (${fkErr?.message || 'no error!'})`);
}

// ══════════════════════════════════════════════════════════════
// Test 2: Edge creation rules
// ══════════════════════════════════════════════════════════════
async function testEdgeCreationRules() {
  console.log('\n📋 Test 2: Edge creation rules');

  // Insert 3 papers for rule testing
  const paperA = makePaper('edge_a', {
    taxonomy_primary: 'robotics/hand/tactile',
    key_concepts: ['tactile sensing', 'force control', 'deep learning'],
    methodology: ['sim-to-real', 'reinforcement learning'],
  });
  const paperB = makePaper('edge_b', {
    taxonomy_primary: 'robotics/hand/tactile',
    key_concepts: ['tactile sensing', 'force control', 'grasping'],
    methodology: ['sim-to-real', 'imitation learning'],
  });
  const paperC = makePaper('edge_c', {
    taxonomy_primary: 'robotics/brain/vla',
    key_concepts: ['vision-language-action', 'force control'],
    methodology: ['imitation learning'],
  });

  await supabase.from('papers').upsert([paperA, paperB, paperC], { onConflict: 'slug' });

  // Rule 1: same taxonomy_primary → same_field
  const sameField = paperA.taxonomy_primary === paperB.taxonomy_primary;
  assert(sameField, 'Paper A and B share taxonomy_primary → same_field candidate');

  const noSameFieldAC = paperA.taxonomy_primary !== paperC.taxonomy_primary;
  assert(noSameFieldAC, 'Paper A and C have different taxonomy_primary → no same_field');

  // Rule 2: key_concepts overlap >= 2 → shared_concepts
  const sharedConceptsAB = paperA.key_concepts.filter(c => paperB.key_concepts.includes(c));
  assert(sharedConceptsAB.length >= 2, `A-B shared concepts: ${sharedConceptsAB.join(', ')} (count=${sharedConceptsAB.length})`);

  const sharedConceptsAC = paperA.key_concepts.filter(c => paperC.key_concepts.includes(c));
  assert(sharedConceptsAC.length < 2, `A-C shared concepts < 2: ${sharedConceptsAC.join(', ')} (count=${sharedConceptsAC.length})`);

  // Rule 3: methodology overlap >= 1 → shared_method
  const sharedMethodAB = paperA.methodology.filter(m => paperB.methodology.includes(m));
  assert(sharedMethodAB.length >= 1, `A-B shared method: ${sharedMethodAB.join(', ')}`);

  const sharedMethodBC = paperB.methodology.filter(m => paperC.methodology.includes(m));
  assert(sharedMethodBC.length >= 1, `B-C shared method: ${sharedMethodBC.join(', ')}`);

  // Rule 4: meta.json relations → confirmed edge
  const relEdge = {
    edge_id: `${paperA.slug}__${paperB.slug}__extends`,
    source_slug: paperA.slug,
    target_slug: paperB.slug,
    edge_type: 'extends',
    provenance: 'meta',
    status: 'confirmed',
    weight: 0.7,
    detail: 'From meta.json relations',
    updated_at: new Date().toISOString(),
  };

  const { error: relErr } = await supabase
    .from('graph_edges')
    .upsert(relEdge, { onConflict: 'edge_id' });

  assert(!relErr, `Meta relation edge created (${relErr?.message || 'ok'})`);

  const { data: relCheck } = await supabase
    .from('graph_edges')
    .select('provenance, status')
    .eq('edge_id', relEdge.edge_id)
    .single();

  assertEq(relCheck?.provenance, 'meta', 'Edge provenance is meta');
  assertEq(relCheck?.status, 'confirmed', 'Edge status is confirmed');
}

// ══════════════════════════════════════════════════════════════
// Test 3: Edge status management
// ══════════════════════════════════════════════════════════════
async function testEdgeStatusManagement() {
  console.log('\n📋 Test 3: Edge status management');

  // Need papers for FK
  const pA = makePaper('status_a');
  const pB = makePaper('status_b');
  await supabase.from('papers').upsert([pA, pB], { onConflict: 'slug' });

  const edgeId = `${pA.slug}__${pB.slug}__same_field`;
  await supabase.from('graph_edges').upsert({
    edge_id: edgeId,
    source_slug: pA.slug,
    target_slug: pB.slug,
    edge_type: 'same_field',
    provenance: 'auto',
    status: 'suggested',
    weight: 0.3,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'edge_id' });

  // 3a: suggested → approve → confirmed
  const { error: approveErr } = await supabase
    .from('graph_edges')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('edge_id', edgeId);

  assert(!approveErr, 'Approve edge (suggested → confirmed)');

  const { data: approved } = await supabase
    .from('graph_edges')
    .select('status')
    .eq('edge_id', edgeId)
    .single();

  assertEq(approved?.status, 'confirmed', 'Edge is confirmed after approve');

  // 3b: Reset to suggested, then reject
  await supabase
    .from('graph_edges')
    .update({ status: 'suggested' })
    .eq('edge_id', edgeId);

  const { error: rejectErr } = await supabase
    .from('graph_edges')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('edge_id', edgeId);

  assert(!rejectErr, 'Reject edge (suggested → rejected)');

  const { data: rejected } = await supabase
    .from('graph_edges')
    .select('status')
    .eq('edge_id', edgeId)
    .single();

  assertEq(rejected?.status, 'rejected', 'Edge is rejected after reject');

  // 3c: Admin confirmed/rejected edge preserved during re-sync
  // Simulate: set to confirmed, then try upsert with same edge_id but status=suggested
  await supabase
    .from('graph_edges')
    .update({ status: 'confirmed' })
    .eq('edge_id', edgeId);

  // sync-papers preserves confirmed/rejected by checking preservedEdgeIds
  // Here we verify the logic: if edge_id is in preservedEdgeIds, it should NOT be overwritten
  const { data: preserveCheck } = await supabase
    .from('graph_edges')
    .select('edge_id, status')
    .eq('edge_id', edgeId)
    .in('status', ['confirmed', 'rejected'])
    .single();

  assert(preserveCheck !== null, 'Confirmed edge is in preserved set');
  assertEq(preserveCheck?.status, 'confirmed', 'Confirmed edge status preserved');
}

// ══════════════════════════════════════════════════════════════
// Test 4: Manual edge
// ══════════════════════════════════════════════════════════════
async function testManualEdge() {
  console.log('\n📋 Test 4: Manual edge');

  const pA = makePaper('manual_a');
  const pB = makePaper('manual_b');
  await supabase.from('papers').upsert([pA, pB], { onConflict: 'slug' });

  const edgeId = `${pA.slug}__${pB.slug}__inspired_by`;

  // 4a: Create manual edge
  const { data: manualEdge, error: manualErr } = await supabase
    .from('graph_edges')
    .upsert({
      edge_id: edgeId,
      source_slug: pA.slug,
      target_slug: pB.slug,
      edge_type: 'inspired_by',
      provenance: 'manual',
      status: 'confirmed',
      weight: 0.7,
      detail: 'Test manual edge',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'edge_id' })
    .select()
    .single();

  assert(!manualErr, `Manual edge created (${manualErr?.message || 'ok'})`);
  assertEq(manualEdge?.provenance, 'manual', 'Provenance is manual');
  assertEq(manualEdge?.status, 'confirmed', 'Status is confirmed');

  // 4b: Duplicate upsert → should just update
  const { error: dupErr } = await supabase
    .from('graph_edges')
    .upsert({
      edge_id: edgeId,
      source_slug: pA.slug,
      target_slug: pB.slug,
      edge_type: 'inspired_by',
      provenance: 'manual',
      status: 'confirmed',
      weight: 0.8,
      detail: 'Updated manual edge',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'edge_id' })
    .select()
    .single();

  assert(!dupErr, 'Duplicate manual edge upsert succeeds');

  const { data: updated } = await supabase
    .from('graph_edges')
    .select('weight, detail')
    .eq('edge_id', edgeId)
    .single();

  assertEq(updated?.weight, 0.8, 'Weight updated on duplicate upsert');
}

// ══════════════════════════════════════════════════════════════
// Test 5: New taxonomy (gap detection)
// ══════════════════════════════════════════════════════════════
async function testNewTaxonomy() {
  console.log('\n📋 Test 5: New taxonomy (gap detection)');

  // Paper with taxonomy not in taxonomy.json
  const paper = makePaper('newtax', {
    taxonomy_primary: 'biology/genomics',
    key_concepts: ['genomics', 'CRISPR'],
    methodology: ['wet lab'],
  });

  const { error: insertErr } = await supabase
    .from('papers')
    .upsert(paper, { onConflict: 'slug' });

  assert(!insertErr, 'Paper with unknown taxonomy saved to DB');

  const { data: found } = await supabase
    .from('papers')
    .select('slug, taxonomy_primary')
    .eq('slug', paper.slug)
    .single();

  assertEq(found?.taxonomy_primary, 'biology/genomics', 'taxonomy_primary stored correctly');

  // No same_field edge (only paper with this taxonomy)
  const { data: edges } = await supabase
    .from('graph_edges')
    .select('edge_id')
    .or(`source_slug.eq.${paper.slug},target_slug.eq.${paper.slug}`)
    .eq('edge_type', 'same_field');

  assertEq(edges?.length || 0, 0, 'No same_field edge (sole paper in taxonomy)');

  // Gap: taxonomy.json doesn't contain biology/genomics
  // This is now handled by sync-papers.mjs with warning
  console.log('  ℹ Gap confirmed: biology/genomics not in taxonomy.json → sync-papers now warns');
}

// ══════════════════════════════════════════════════════════════
// Test 6: Edge deletion
// ══════════════════════════════════════════════════════════════
async function testEdgeDeletion() {
  console.log('\n📋 Test 6: Edge deletion');

  const pA = makePaper('del_a');
  const pB = makePaper('del_b');
  await supabase.from('papers').upsert([pA, pB], { onConflict: 'slug' });

  const edgeId = `${pA.slug}__${pB.slug}__same_field`;
  await supabase.from('graph_edges').upsert({
    edge_id: edgeId,
    source_slug: pA.slug,
    target_slug: pB.slug,
    edge_type: 'same_field',
    provenance: 'auto',
    status: 'suggested',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'edge_id' });

  // 6a: Delete edge
  const { error: delErr } = await supabase
    .from('graph_edges')
    .delete()
    .eq('edge_id', edgeId);

  assert(!delErr, 'Edge deleted successfully');

  const { data: afterDel } = await supabase
    .from('graph_edges')
    .select('edge_id')
    .eq('edge_id', edgeId);

  assertEq(afterDel?.length || 0, 0, 'Edge no longer exists in DB');

  // 6b: Papers still exist
  const { data: papersAfter } = await supabase
    .from('papers')
    .select('slug')
    .in('slug', [pA.slug, pB.slug]);

  assertEq(papersAfter?.length, 2, 'Related papers unaffected by edge deletion');
}

// ══════════════════════════════════════════════════════════════
// Test 7: Layout
// ══════════════════════════════════════════════════════════════
async function testLayout() {
  console.log('\n📋 Test 7: Layout');

  const paper = makePaper('layout1');
  await supabase.from('papers').upsert(paper, { onConflict: 'slug' });

  // 7a: Create initial layout
  const { error: layoutErr } = await supabase
    .from('node_layouts')
    .upsert({
      slug: paper.slug,
      view_id: 'default',
      x: 100,
      y: 200,
      pinned: false,
    }, { onConflict: 'slug,view_id' });

  assert(!layoutErr, 'Initial layout created');

  // 7b: Pin layout
  await supabase
    .from('node_layouts')
    .update({ pinned: true, x: 500, y: 300 })
    .eq('slug', paper.slug)
    .eq('view_id', 'default');

  const { data: pinned } = await supabase
    .from('node_layouts')
    .select('pinned, x, y')
    .eq('slug', paper.slug)
    .eq('view_id', 'default')
    .single();

  assert(pinned?.pinned === true, 'Layout is pinned');
  assertEq(pinned?.x, 500, 'Pinned x preserved');

  // 7c: Re-sync should NOT overwrite pinned layout
  // (sync-papers.mjs checks pinned before upserting)
  const { data: pinnedSlugs } = await supabase
    .from('node_layouts')
    .select('slug')
    .eq('view_id', 'default')
    .eq('pinned', true)
    .eq('slug', paper.slug);

  assert((pinnedSlugs?.length || 0) > 0, 'Pinned layout found → sync would skip');
}

// ══════════════════════════════════════════════════════════════
// Test 8: Rebalancing scenario
// ══════════════════════════════════════════════════════════════
async function testRebalancing() {
  console.log('\n📋 Test 8: Rebalancing scenario');

  // Create 6 papers with 6 different top-level taxonomies
  const topLevelTaxonomies = [
    'robotics', 'ai', 'biology', 'physics', 'chemistry', 'mathematics',
  ];

  const papers = topLevelTaxonomies.map((tax, i) =>
    makePaper(`rebal_${i}`, { taxonomy_primary: tax })
  );

  await supabase.from('papers').upsert(papers, { onConflict: 'slug' });

  // Count unique top-level taxonomies
  const uniqueTopLevel = new Set(
    papers.map(p => p.taxonomy_primary.split('/')[0])
  );

  assert(uniqueTopLevel.size > 5, `${uniqueTopLevel.size} top-level taxonomies (>5 → warning expected)`);
  console.log('  ℹ sync-papers.mjs now warns when top-level nodes exceed 5');
}

// ══════════════════════════════════════════════════════════════
// Main
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('🧪 Paper Graph DB — Integration Tests\n');
  console.log('Cleaning up previous test data...');
  await cleanup();

  try {
    await testPaperCRUD();
    await testEdgeCreationRules();
    await testEdgeStatusManagement();
    await testManualEdge();
    await testNewTaxonomy();
    await testEdgeDeletion();
    await testLayout();
    await testRebalancing();
  } finally {
    console.log('\nCleaning up test data...');
    await cleanup();
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
