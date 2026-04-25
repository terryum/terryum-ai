/**
 * Single source of truth for the Cloudflare R2 public CDN URL (Node scripts).
 * Mirror of src/lib/r2-config.ts — kept separate because .mjs can't import .ts.
 *
 * Callers must `await loadEnv()` (scripts/lib/env.mjs) before this returns
 * a non-empty string.
 */
import { S3Client } from '@aws-sdk/client-s3';

export function getR2PublicUrl() {
  return process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_URL || '';
}

const ACCOUNT_KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'];

export function assertR2Env({ requireBucket = false } = {}) {
  const missing = ACCOUNT_KEYS.filter((k) => !process.env[k]);
  if (requireBucket && !process.env.R2_BUCKET_NAME) missing.push('R2_BUCKET_NAME');
  if (missing.length) {
    throw new Error(
      `Missing R2 credentials in .env.local: ${missing.join(', ')}`
    );
  }
  return {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET_NAME || '',
  };
}

export function getR2Client({ requireBucket = false } = {}) {
  const env = assertR2Env({ requireBucket });
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
  return { s3, bucket: env.bucket };
}
