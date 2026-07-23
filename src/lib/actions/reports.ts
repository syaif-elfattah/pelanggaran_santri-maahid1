"use server";

import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
import { REPORT_PAGE_SIZE, EXPORT_MAX_ROWS } from "@/lib/pagination";

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

export type ReportSortKey = "studentName" | "kelas" | "severity" | "dateAt";
export type ReportSortDir = "asc" | "desc";

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

export type ReportPage = {
  rows: ReportRow[];
  totalCount: number;
};

const SORT_COLUMN: Record<ReportSortKey, string> = {
  studentName: "student_name",
  kelas: "kelas",
  severity: "severity_rank",
  dateAt: "date_at",
};

type ReportViewRow = {
  id: string;
  violation: string;
  date_at: string;
  time_at: string | null;
  notes: string | null;
  severity: "ringan" | "sedang" | "berat" | null;
  student_name: string;
  kelas: string;
};

function mapRow(row: ReportViewRow): ReportRow {
  return {
    id: row.id,
    studentName: row.student_name,
    kelas: row.kelas,
    violation: row.violation,
    severity: row.severity ?? null,
    dateAt: row.date_at,
    timeAt: row.time_at,
    notes: row.notes,
  };
}

/**
 * Bikin query dasar ke view violations_report, lengkap sama semua filter
 * dan pembatasan akses per role. Dipakai bareng sama versi berhalaman
 * (buat tampilan) maupun versi lengkap (buat export) -- biar aturan
 * filter & pembatasan aksesnya nggak mungkin beda antara keduanya.
 */
function buildReportQuery(
  supabase: ReturnType<typeof getSupabaseServer>,
  filters: ReportFilters,
  allowedClassIds: string[] | null,
  countMode: "exact" | null
) {
  let query = supabase
    .from("violations_report")
    .select(
      "id, violation, date_at, time_at, notes, severity, student_name, kelas",
      countMode ? { count: countMode } : undefined
    );

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

  return query;
}

export async function getViolationsReport(
  filters: ReportFilters,
  page = 1,
  sortKey: ReportSortKey = "dateAt",
  sortDir: ReportSortDir = "desc"
): Promise<ReportPage> {
  const allowedClassIds = await getAllowedClassIds();
  if (allowedClassIds && allowedClassIds.length === 0) return { rows: [], totalCount: 0 };

  const supabase = getSupabaseServer();
  const from = (page - 1) * REPORT_PAGE_SIZE;

  // Pengurutan & pemotongan halaman dilakuin di DATABASE, bukan di aplikasi
  // -- jadi berapa pun total datanya, yang dikirim balik cuma 50 baris.
  const { data, error, count } = await buildReportQuery(supabase, filters, allowedClassIds, "exact")
    .order(SORT_COLUMN[sortKey], { ascending: sortDir === "asc" })
    .order("id", { ascending: true })
    .range(from, from + REPORT_PAGE_SIZE - 1);

  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []).map((r) => mapRow(r as ReportViewRow)),
    totalCount: count ?? 0,
  };
}

export type ExportResult =
  | { success: true; rows: ReportRow[] }
  | { success: false; error: string };

/**
 * Ambil SEMUA baris hasil filter (tanpa dipotong per halaman) -- khusus
 * buat PDF/WA, biar isinya utuh sesuai filter, bukan cuma halaman yang
 * lagi kebuka di layar.
 */
export async function getViolationsForExport(filters: ReportFilters): Promise<ExportResult> {
  const allowedClassIds = await getAllowedClassIds();
  if (allowedClassIds && allowedClassIds.length === 0) return { success: true, rows: [] };

  const supabase = getSupabaseServer();

  const { data, error, count } = await buildReportQuery(supabase, filters, allowedClassIds, "exact")
    .order("date_at", { ascending: false })
    .range(0, EXPORT_MAX_ROWS - 1);

  if (error) return { success: false, error: error.message };

  if ((count ?? 0) > EXPORT_MAX_ROWS) {
    return {
      success: false,
      error: `Hasil filter ada ${count} baris, kebanyakan buat satu file (maksimal ${EXPORT_MAX_ROWS}). Persempit dulu filternya -- misal pilih satu kelas atau rentang tanggal yang lebih pendek.`,
    };
  }

  return { success: true, rows: (data ?? []).map((r) => mapRow(r as ReportViewRow)) };
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
