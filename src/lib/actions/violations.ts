"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
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

export type SaveViolationsResult = { success: true; count: number } | { success: false; error: string };

export async function saveViolations(
  classId: string,
  entries: ViolationEntryInput[]
): Promise<SaveViolationsResult> {
  const filled = entries.filter((e) => e.violationLabel.trim().length > 0);

  if (filled.length === 0) {
    return { success: false, error: "Belum ada pelanggaran yang diisi." };
  }

  const activeYear = await getActiveAcademicYear();
  const supabase = getSupabaseServer();

  // Severity buat jenis preset selalu diambil dari violation_types di server
  // (satu sumber kebenaran) -- yang dari client cuma dipakai kalau ini entri
  // custom "Lainnya" yang nggak punya violation_type_id buat dicek.
  const typeIds = [...new Set(filled.map((e) => e.violationTypeId).filter((id): id is string => !!id))];
  const severityByType = new Map<string, string>();
  if (typeIds.length > 0) {
    const { data: types, error: typeError } = await supabase
      .from("violation_types")
      .select("id, severity")
      .in("id", typeIds);
    if (typeError) return { success: false, error: typeError.message };
    for (const t of types ?? []) severityByType.set(t.id, t.severity);
  }

  const rows = filled.map((e) => ({
    student_id: e.studentId,
    class_id: classId,
    academic_year_id: activeYear.id,
    violation_type_id: e.violationTypeId,
    violation: e.violationLabel.trim(),
    severity: e.violationTypeId ? severityByType.get(e.violationTypeId) ?? null : e.severity,
    time_at: e.timeAt || null,
    date_at: e.dateAt,
    notes: e.notes.trim() || null,
  }));

  const { error } = await supabase.from("violations").insert(rows);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, count: rows.length };
}
