import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { LaporanDocument } from "@/lib/pdf/laporan-document";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
import type { ReportRow } from "@/lib/actions/reports";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const rows = body.rows as ReportRow[] | undefined;
  const scopeLabel = String(body.scopeLabel ?? "");
  const periodLabel = String(body.periodLabel ?? "Semua periode");
  const classId = String(body.classId ?? "");

  if (!Array.isArray(rows)) {
    return NextResponse.json({ success: false, error: "Data laporan tidak valid." }, { status: 400 });
  }

  if (!classId) {
    return NextResponse.json({ success: false, error: "Kelas belum dipilih." }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { data: teacher, error: teacherError } = await supabase
    .from("homeroom_teachers")
    .select("name, phone")
    .eq("class_id", classId)
    .eq("academic_year_id", activeYear.id)
    .maybeSingle();

  if (teacherError) {
    return NextResponse.json({ success: false, error: teacherError.message }, { status: 500 });
  }

  if (!teacher || !teacher.phone) {
    return NextResponse.json(
      { success: false, error: "Wali kelas / nomor WA-nya belum diatur di Manajemen kelas." },
      { status: 400 }
    );
  }

  const buffer = await renderToBuffer(
    <LaporanDocument rows={rows} scopeLabel={scopeLabel} periodLabel={periodLabel} />
  );

  const path = `${activeYear.label.replace("/", "-")}/${Date.now()}_laporan-${classId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(path, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
  }

  const { data: publicUrlData } = supabase.storage.from("reports").getPublicUrl(path);

  return NextResponse.json({
    success: true,
    publicUrl: publicUrlData.publicUrl,
    waliName: teacher.name,
    waliPhone: normalizePhone(teacher.phone),
  });
}
