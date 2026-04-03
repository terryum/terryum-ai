#!/usr/bin/env node

/**
 * check-supabase.mjs
 * Verifies Supabase project connectivity and prints status.
 * Usage: node scripts/check-supabase.mjs
 */

import dns from 'dns/promises';

const PROJECT_REF = 'fyrgooabpegysrcawtdm';
const HOST = `${PROJECT_REF}.supabase.co`;
const DASHBOARD_URL = `https://supabase.com/dashboard/project/${PROJECT_REF}`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Check env vars
  if (!url || !serviceKey) {
    console.error('❌ Missing env vars. Ensure .env.local has:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Check DNS resolution
  console.log(`🔍 Checking DNS for ${HOST}...`);
  try {
    const addresses = await dns.resolve4(HOST);
    console.log(`✅ DNS OK: ${addresses.join(', ')}`);
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') {
      console.error(`❌ DNS FAILED: ${HOST} does not resolve.`);
      console.error('');
      console.error('   프로젝트가 일시정지(paused) 상태일 수 있습니다.');
      console.error(`   → ${DASHBOARD_URL} 에서 "Restore project" 클릭`);
      console.error('   → dev@artlab.ai 계정으로 로그인');
      process.exit(1);
    }
    throw err;
  }

  // Check API connectivity
  console.log('🔍 Checking API connectivity...');
  try {
    const resp = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (resp.ok) {
      console.log('✅ API OK: Supabase REST API reachable');
    } else {
      console.error(`⚠️  API returned ${resp.status}: ${resp.statusText}`);
    }
  } catch (err) {
    console.error(`❌ API FAILED: ${err.message}`);
    process.exit(1);
  }

  // Check papers table
  console.log('🔍 Checking papers table...');
  try {
    const resp = await fetch(`${url}/rest/v1/papers?select=slug&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log(`✅ Papers table OK: ${data.length > 0 ? data[0].slug : '(empty)'}`);
    } else {
      console.warn(`⚠️  Papers table: ${resp.status} ${resp.statusText}`);
    }
  } catch (err) {
    console.warn(`⚠️  Papers table check failed: ${err.message}`);
  }

  console.log('\n✅ Supabase connection is healthy.');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
