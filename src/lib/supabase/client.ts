import { createClient } from "@supabase/supabase-js";

/**
 * Browser client using the public anon key.
 * Hanya dipakai untuk operasi non-sensitif (mis. subscribe realtime).
 * Semua write operasi tetap lewat server action / route handler.
 */
export function getSupabaseBrowser() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
