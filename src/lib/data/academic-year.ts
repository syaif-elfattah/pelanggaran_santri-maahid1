import { cache } from "react";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Selalu ambil tahun ajaran lewat fungsi ini -- jangan hardcode
 * string "2026/2027" di komponen manapun (itu salah satu masalah
 * yang harus dihindari dari sistem lama).
 *
 * Dibungkus cache() dari React: dalam SATU request yang sama, berapa kali
 * pun fungsi ini dipanggil (ada 14 titik panggil di seluruh aplikasi),
 * query ke database cuma jalan SEKALI -- sisanya pakai hasil yang sama.
 * Cache-nya otomatis kereset tiap request baru, jadi tetap selalu fresh.
 */
export const getActiveAcademicYear = cache(async () => {
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
});
