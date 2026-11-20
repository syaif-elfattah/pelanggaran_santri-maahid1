"use server";

import { randomUUID } from "crypto";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
import { requireServerRole } from "@/lib/auth/guard";
import { cleanLabels } from "@/lib/followups";
import type { ClassRow, StudentRow, ViolationType, ViolationEntryInput } from "@/types/database";

export async function getClasses(activeOnly: boolean = true): Promise<ClassRow[]> {
  const supabase = getSupabaseServer();
  let query = supabase.from("classes").select("id, kelas").order("kelas", { ascending: true });

  if (activeOnly) query = query.eq("is_active", true);

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getViolationTypes(): Promise<ViolationType[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("violation_types")
    .select("id, label, severity")
    .eq("is_active", true)
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getStudentsForClass(classId: string): Promise<StudentRow[]> {
  if (!classId) return [];

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { data, error } = await supabase
    .from("student_enrollments")
    .select("students(id, name)")
    .eq("class_id", classId)
    .eq("academic_year_id", activeYear.id)
    .eq("status", "aktif");

  if (error) throw new Error(error.message);

  // Supabase selalu balikin join sebagai array, meski relasinya satu-ke-satu.
  return (data ?? [])
    .map((row) => {
      const student = Array.isArray(row.students) ? row.students[0] : row.students;
      return student as StudentRow | null;
    })
    .filter((s): s is StudentRow => Boolean(s))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type SaveViolationsResult =
  | { success: true; count: number; followedUp: number }
  | { success: false; error: string };

export async function saveViolations(
  classId: string,
  entries: ViolationEntryInput[]
): Promise<SaveViolationsResult> {
  let session;
  try {
    session = await requireServerRole(["admin", "wali_kelas", "guru"]);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Sesi habis, silakan login ulang." };
  }

  const filled = entries.filter((e) => e.violationLabel.trim().length > 0);

  if (filled.length === 0) {
    return { success: false, error: "Belum ada pelanggaran yang diisi." };
  }

  const missingSeverity = filled.find((e) => !e.severity);
  if (missingSeverity) {
    return { success: false, error: "Tingkat pelanggaran (ringan/sedang/berat) wajib dipilih buat semua baris." };
  }

  const missingFollowup = filled.find((e) => e.followup && cleanLabels(e.followup.labels).length === 0);
  if (missingFollowup) {
    return { success: false, error: "Ada baris yang dipilih \"Sudah dibina\" tapi bentuk pembinaannya belum diisi." };
  }

  const activeYear = await getActiveAcademicYear();
  const supabase = getSupabaseServer();

  // Tingkat pelanggaran sekarang selalu dipilih manual sama yang input --
  // nggak lagi otomatis ngikut jenis presetnya, biar staf yang nentuin
  // sendiri tiap kejadian, bukan dianggap sama rata cuma karena jenisnya sama.
  //
  // ID dibikin di sini (bukan dibiarin database) biar catatan pembinaan
  // langsung bisa nunjuk ke pelanggaran yang baru dibuat tanpa nebak urutan.
  const rows = filled.map((e) => ({
    id: randomUUID(),
    student_id: e.studentId,
    class_id: classId,
    academic_year_id: activeYear.id,
    violation_type_id: e.violationTypeId,
    violation: e.violationLabel.trim(),
    severity: e.severity,
    time_at: e.timeAt || null,
    date_at: e.dateAt,
    notes: e.notes.trim() || null,
    created_by: session.id,
    created_by_name: session.name,
    created_by_role: session.role,
  }));

  const { error } = await supabase.from("violations").insert(rows);

  if (error) {
    return { success: false, error: error.message };
  }

  // Dibina langsung saat input: pembinanya = yang mencatat pelanggaran.
  const followupRows = filled.flatMap((e, i) =>
    e.followup
      ? [
          {
            violation_id: rows[i].id,
            labels: cleanLabels(e.followup.labels),
            done_at: e.dateAt,
            notes: e.followup.notes.trim() || null,
            is_direct: true,
            staff_id: session.id,
            staff_name: session.name,
            staff_role: session.role,
          },
        ]
      : []
  );

  if (followupRows.length > 0) {
    const { error: followupError } = await supabase.from("violation_followups").insert(followupRows);
    if (followupError) {
      // Batalin pelanggaran yang barusan masuk -- jangan sampai tersimpan
      // setengah (pelanggarannya ada, catatan pembinaannya hilang).
      await supabase.from("violations").delete().in("id", rows.map((r) => r.id));
      return { success: false, error: `Gagal menyimpan pembinaan: ${followupError.message}` };
    }
  }

  return { success: true, count: rows.length, followedUp: followupRows.length };
}
