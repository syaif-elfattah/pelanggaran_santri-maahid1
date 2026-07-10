import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service role key.
 * Bypasses RLS deliberately -- semua pengecekan akses dilakukan
 * di layer aplikasi (proxy.ts + session), bukan lewat RLS anon key
 * seperti versi lama.
 */
export function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
