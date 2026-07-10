import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = getSupabaseServer();
  const { data: classes } = await supabase
    .from("classes")
    .select("kelas")
    .eq("is_active", true)
    .order("kelas", { ascending: true });

  const wb = XLSX.utils.book_new();

  // Baris contoh sengaja pakai nama kelas yang nggak mungkin valid --
  // kalau lupa dihapus, sistem nolak jelas pas import, bukan malah
  // kesimpen jadi santri palsu.
  const importSheet = XLSX.utils.aoa_to_sheet([
    ["Nama", "Kelas"],
    ["Contoh: Ahmad Fauzan", "HAPUS BARIS INI"],
  ]);
  importSheet["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, importSheet, "Import");

  const refRows = [
    ["Salin persis salah satu nama kelas ini ke kolom Kelas di sheet Import"],
    ...(classes ?? []).map((c) => [c.kelas]),
  ];
  const refSheet = XLSX.utils.aoa_to_sheet(refRows);
  refSheet["!cols"] = [{ wch: 45 }];
  XLSX.utils.book_append_sheet(wb, refSheet, "Daftar Kelas");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-santri-baru.xlsx"',
    },
  });
}
