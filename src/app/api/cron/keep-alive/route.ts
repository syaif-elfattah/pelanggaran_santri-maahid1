import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Dipanggil otomatis sama Vercel Cron (lihat vercel.json) -- query paling
// ringan ke database, cuma buat mastiin Supabase nganggep project ini
// "aktif" biar nggak di-pause gara-gara 7 hari nggak ada aktivitas.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  const { error } = await supabase.from("academic_years").select("id").limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
}
