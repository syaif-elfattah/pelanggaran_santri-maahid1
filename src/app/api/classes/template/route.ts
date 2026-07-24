import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export async function GET() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wb = XLSX.utils.book_new();

  // Baris contoh sengaja pakai nama kelas yang jelas palsu -- kalau lupa
  // dihapus, gampang kelihatan aneh di Manajemen Kelas, bukan nyampur
  // diam-diam kayak data asli.
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Kelas", "Wali Kelas", "No. WA Wali Kelas"],
    ["CONTOH - HAPUS BARIS INI", "Nama Wali Kelas", "081234567890"],
  ]);
  sheet["!cols"] = [{ wch: 20 }, { wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, sheet, "Kelas");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-kelas-wali-kelas.xlsx"',
    },
  });
}
