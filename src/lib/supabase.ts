import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getEnvValue(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

function getUrl() {
  return getEnvValue('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
}

function getAnonKey() {
  return getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');
}

function getServiceRoleKey() {
  return getEnvValue('SUPABASE_SERVICE_ROLE_KEY');
}

/** Browser client (anon key, RLS 적용) */
export function getSupabaseBrowser(): SupabaseClient {
  const url = getUrl(), anonKey = getAnonKey();
  if (!url || !anonKey) {
    throw new Error('Supabase URL or anon key is not configured');
  }
  return createClient(url, anonKey);
}

/** Server/script client (service role key, RLS 우회) */
export function getSupabaseAdmin(): SupabaseClient {
  const url = getUrl(), serviceRoleKey = getServiceRoleKey();
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL or service role key is not configured');
  }
  return createClient(url, serviceRoleKey);
}

/** Check if Supabase is configured */
export function isSupabaseConfigured(): boolean {
  return !!(getUrl() && getAnonKey());
}

/** Check if Supabase admin (service role) is configured */
export function isSupabaseAdminConfigured(): boolean {
  return !!(getUrl() && getServiceRoleKey());
}
