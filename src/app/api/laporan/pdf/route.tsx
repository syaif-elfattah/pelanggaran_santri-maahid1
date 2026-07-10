import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaporanDocument } from "@/lib/pdf/laporan-document";
import type { ReportRow } from "@/lib/actions/reports";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rows = body.rows as ReportRow[];
  const scopeLabel = String(body.scopeLabel ?? "Semua kelas");
  const periodLabel = String(body.periodLabel ?? "Semua periode");

  // Render langsung dari data yang udah difilter di client -- nggak query
  // ulang ke Supabase, biar nggak dobel biaya database buat aksi yang sama.
  const buffer = await renderToBuffer(
    <LaporanDocument rows={rows} scopeLabel={scopeLabel} periodLabel={periodLabel} />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="laporan-pelanggaran.pdf"',
    },
  });
}
