#!/usr/bin/env node

import { loadEnv } from './lib/env.mjs';
import { provisionSurveyPreview } from './lib/cloudflare-survey-access.mjs';

await loadEnv();
const args = Object.fromEntries(process.argv.slice(2).map((item) => {
  const [key, ...rest] = item.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : true];
}));
const project = String(args.project ?? '');
const hostname = String(args.hostname ?? '');
if (!/^[a-z0-9][a-z0-9-]*$/.test(project) || hostname !== `${project}.pages.dev`) {
  throw new Error('Usage: provision-survey-preview-access.mjs --project=<slug-preview> --hostname=<slug-preview.pages.dev> [--dry-run]');
}
if (!project.endsWith('-preview')) throw new Error('preview project name must end with -preview');

const required = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  adminEmail: process.env.ADMIN_EMAIL,
  serviceTokenId: process.env.CF_ACCESS_SERVICE_TOKEN_ID,
};
for (const [name, value] of Object.entries(required)) {
  if (!value) throw new Error(`${name} is required for preview Access provisioning`);
}
const result = await provisionSurveyPreview({ ...required, project, hostname, dryRun: Boolean(args['dry-run']) });
console.log(JSON.stringify(result));
