"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";

export type DashboardStats = {
  total: number;
  ringan: number;
  sedang: number;
  berat: number;
  academicYearLabel: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startStr = startOfMonth.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("violations")
    .select("id, violation_types(severity)")
    .eq("academic_year_id", activeYear.id)
    .gte("date_at", startStr);

  if (error) throw new Error(error.message);

  let ringan = 0;
  let sedang = 0;
  let berat = 0;

  for (const row of data ?? []) {
    const vt = Array.isArray(row.violation_types) ? row.violation_types[0] : row.violation_types;
    if (vt?.severity === "ringan") ringan++;
    else if (vt?.severity === "sedang") sedang++;
    else if (vt?.severity === "berat") berat++;
  }

  return { total: data?.length ?? 0, ringan, sedang, berat, academicYearLabel: activeYear.label };
}

export type RecentViolation = {
  id: string;
  studentName: string;
  kelas: string;
  severity: "ringan" | "sedang" | "berat" | null;
  violation: string;
  dateAt: string;
};

export async function getRecentViolations(limit = 5): Promise<RecentViolation[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("violations")
    .select("id, violation, date_at, students(name), classes(kelas), violation_types(severity)")
    .order("date_at", { ascending: false })
    .order("time_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const kelas = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    const vt = Array.isArray(row.violation_types) ? row.violation_types[0] : row.violation_types;
    return {
      id: row.id,
      studentName: student?.name ?? "-",
      kelas: kelas?.kelas ?? "-",
      severity: vt?.severity ?? null,
      violation: row.violation,
      dateAt: row.date_at,
    };
  });
}
