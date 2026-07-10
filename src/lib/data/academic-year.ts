import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Selalu ambil tahun ajaran lewat fungsi ini -- jangan hardcode
 * string "2026/2027" di komponen manapun (itu salah satu masalah
 * yang harus dihindari dari sistem lama).
 */
export async function getActiveAcademicYear() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, label, is_active")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      "Tidak ada tahun ajaran aktif -- cek tabel academic_years, harus ada 1 baris is_active = true."
    );
  }

  return data;
}
