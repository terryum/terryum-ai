import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** Browser client (anon key, RLS 적용) */
export function getSupabaseBrowser(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase URL or anon key is not configured');
  }
  return createClient(url, anonKey);
}

/** Server/script client (service role key, RLS 우회) */
export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase URL or service role key is not configured');
  }
  return createClient(url, serviceRoleKey);
}

/** Check if Supabase is configured */
export function isSupabaseConfigured(): boolean {
  return !!(url && anonKey);
}

/** Check if Supabase admin (service role) is configured */
export function isSupabaseAdminConfigured(): boolean {
  return !!(url && serviceRoleKey);
}
