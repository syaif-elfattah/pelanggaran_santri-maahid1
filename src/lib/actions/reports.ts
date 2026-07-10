"use server";

import { getSupabaseServer } from "@/lib/supabase/server";

export type AcademicYearOption = { id: string; label: string; is_active: boolean };

export async function getAcademicYears(): Promise<AcademicYearOption[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("academic_years")
    .select("id, label, is_active")
    .order("label", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type ReportFilters = {
  classId?: string;
  studentId?: string;
  academicYearId?: string;
  fromDate?: string;
  toDate?: string;
};

export type ReportRow = {
  id: string;
  studentName: string;
  kelas: string;
  violation: string;
  severity: "ringan" | "sedang" | "berat" | null;
  dateAt: string;
  timeAt: string | null;
  notes: string | null;
};

export async function getViolationsReport(filters: ReportFilters): Promise<ReportRow[]> {
  const supabase = getSupabaseServer();

  let query = supabase
    .from("violations")
    .select(
      "id, violation, date_at, time_at, notes, students(name), classes(kelas), violation_types(severity)"
    )
    // PostgREST default cap-nya 1000 baris -- naikin eksplisit biar nggak
    // ke-truncate diam-diam kalau suatu saat datanya makin banyak.
    .range(0, 4999)
    .order("date_at", { ascending: false });

  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters.fromDate) query = query.gte("date_at", filters.fromDate);
  if (filters.toDate) query = query.lte("date_at", filters.toDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const kelas = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    const vt = Array.isArray(row.violation_types) ? row.violation_types[0] : row.violation_types;
    return {
      id: row.id,
      studentName: student?.name ?? "-",
      kelas: kelas?.kelas ?? "-",
      violation: row.violation,
      severity: vt?.severity ?? null,
      dateAt: row.date_at,
      timeAt: row.time_at,
      notes: row.notes,
    };
  });
}

export async function deleteViolation(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("violations").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
