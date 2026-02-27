import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client using the service_role key.
 * Bypasses RLS — use ONLY in admin API routes that are already
 * protected by the isAdminRequest() JWT check.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
