"use server";

import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { getActiveAcademicYear } from "@/lib/data/academic-year";

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

/**
 * Kelas yang boleh diakses laporannya sama sesi yang lagi login.
 * null = nggak dibatasi (admin, bisa lihat semua kelas).
 * Array kosong = wali kelas tapi belum di-assign ke kelas manapun tahun ini.
 */
export async function getAllowedClassIds(): Promise<string[] | null> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) throw new Error("Sesi habis, silakan login ulang.");
  if (session.role !== "wali_kelas") return null;

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();
  const { data } = await supabase
    .from("homeroom_teachers")
    .select("class_id")
    .eq("staff_id", session.id)
    .eq("academic_year_id", activeYear.id);

  return (data ?? []).map((r) => r.class_id);
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
  const allowedClassIds = await getAllowedClassIds();
  if (allowedClassIds && allowedClassIds.length === 0) return [];

  const supabase = getSupabaseServer();

  let query = supabase
    .from("violations")
    .select(
      "id, violation, date_at, time_at, notes, severity, students(name), classes(kelas)"
    )
    // PostgREST default cap-nya 1000 baris -- naikin eksplisit biar nggak
    // ke-truncate diam-diam kalau suatu saat datanya makin banyak.
    .range(0, 4999)
    .order("date_at", { ascending: false });

  // Wali kelas: paksa batasin ke kelas ampuannya, apa pun classId yang
  // diminta dari client -- jangan percaya begitu aja permintaan dari client
  // buat hal yang berhubungan sama batasan akses.
  if (allowedClassIds) {
    const requested = filters.classId && allowedClassIds.includes(filters.classId) ? filters.classId : null;
    query = requested ? query.eq("class_id", requested) : query.in("class_id", allowedClassIds);
  } else if (filters.classId) {
    query = query.eq("class_id", filters.classId);
  }

  if (filters.studentId) query = query.eq("student_id", filters.studentId);
  if (filters.academicYearId) query = query.eq("academic_year_id", filters.academicYearId);
  if (filters.fromDate) query = query.gte("date_at", filters.fromDate);
  if (filters.toDate) query = query.lte("date_at", filters.toDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const kelas = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    return {
      id: row.id,
      studentName: student?.name ?? "-",
      kelas: kelas?.kelas ?? "-",
      violation: row.violation,
      severity: row.severity ?? null,
      dateAt: row.date_at,
      timeAt: row.time_at,
      notes: row.notes,
    };
  });
}

export async function deleteViolation(id: string): Promise<{ success: boolean; error?: string }> {
  const allowedClassIds = await getAllowedClassIds();

  const supabase = getSupabaseServer();

  if (allowedClassIds) {
    const { data: violation } = await supabase.from("violations").select("class_id").eq("id", id).maybeSingle();
    if (!violation || !allowedClassIds.includes(violation.class_id)) {
      return { success: false, error: "Kamu nggak punya akses buat hapus data ini." };
    }
  }

  const { error } = await supabase.from("violations").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
