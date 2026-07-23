"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
import { requireServerRole } from "@/lib/auth/guard";

export type DashboardStats = {
  total: number;
  ringan: number;
  sedang: number;
  berat: number;
  academicYearLabel: string;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startStr = startOfMonth.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("violations")
    .select("id, severity")
    .eq("academic_year_id", activeYear.id)
    .gte("date_at", startStr);

  if (error) throw new Error(error.message);

  let ringan = 0;
  let sedang = 0;
  let berat = 0;

  for (const row of data ?? []) {
    if (row.severity === "ringan") ringan++;
    else if (row.severity === "sedang") sedang++;
    else if (row.severity === "berat") berat++;
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
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  // Sengaja dibatasin ke tahun ajaran aktif -- biar konsisten sama statistik
  // di atasnya, dan nggak nyampur histori lama tanpa keterangan tahun/kelas
  // yang jelas pas ditampilin di dashboard.
  const { data, error } = await supabase
    .from("violations")
    .select("id, violation, date_at, severity, students(name), classes(kelas)")
    .eq("academic_year_id", activeYear.id)
    .order("date_at", { ascending: false })
    .order("time_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const kelas = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    return {
      id: row.id,
      studentName: student?.name ?? "-",
      kelas: kelas?.kelas ?? "-",
      severity: row.severity ?? null,
      violation: row.violation,
      dateAt: row.date_at,
    };
  });
}
