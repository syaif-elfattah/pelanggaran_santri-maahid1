"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";

export type StudentStatusRow = {
  studentId: string;
  studentName: string;
  kelas: string;
  academicYearLabel: string;
  status: "aktif" | "naik" | "lulus" | "keluar" | "pindah";
};

export type StudentFilters = {
  status?: string;
  classId?: string;
  search?: string;
};

export async function getStudents(filters: StudentFilters): Promise<StudentStatusRow[]> {
  const supabase = getSupabaseServer();

  let query = supabase
    .from("student_current_status")
    .select("student_id, student_name, kelas, academic_year_label, status, class_id")
    .range(0, 4999)
    .order("student_name", { ascending: true });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.classId) query = query.eq("class_id", filters.classId);
  if (filters.search) query = query.ilike("student_name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    studentId: row.student_id,
    studentName: row.student_name,
    kelas: row.kelas,
    academicYearLabel: row.academic_year_label,
    status: row.status,
  }));
}

export type AddStudentResult = { success: true } | { success: false; error: string };

export async function addStudent(name: string, classId: string): Promise<AddStudentResult> {
  if (!name.trim() || !classId) {
    return { success: false, error: "Nama dan kelas wajib diisi." };
  }

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({ name: name.trim(), class_id: classId })
    .select("id")
    .single();

  if (studentError || !student) {
    return { success: false, error: studentError?.message ?? "Gagal menyimpan santri." };
  }

  const { error: enrollError } = await supabase.from("student_enrollments").insert({
    student_id: student.id,
    class_id: classId,
    academic_year_id: activeYear.id,
    status: "aktif",
  });

  if (enrollError) {
    return { success: false, error: enrollError.message };
  }

  return { success: true };
}

export async function markStudentStatus(
  studentId: string,
  status: "aktif" | "lulus" | "keluar"
): Promise<AddStudentResult> {
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { error } = await supabase
    .from("student_enrollments")
    .update({ status })
    .eq("student_id", studentId)
    .eq("academic_year_id", activeYear.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export type ImportRow = { name: string; kelas: string };

export type ImportRowError = { row: number; name: string; reason: string };

export type ImportResult =
  | { success: true; imported: number; errors: ImportRowError[] }
  | { success: false; error: string };

export async function importStudents(rows: ImportRow[]): Promise<ImportResult> {
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, kelas")
    .eq("is_active", true);
  if (classError) return { success: false, error: classError.message };

  const classByName = new Map((classes ?? []).map((c) => [c.kelas.trim().toLowerCase(), c.id]));

  const valid: { name: string; classId: string }[] = [];
  const errors: ImportRowError[] = [];

  rows.forEach((r, i) => {
    const rowNumber = i + 2; // +2: baris 1 = header di Excel
    const name = (r.name ?? "").toString().trim();
    const kelasRaw = (r.kelas ?? "").toString().trim();

    if (!name && !kelasRaw) return; // baris kosong, lewatin diam-diam

    if (!name) {
      errors.push({ row: rowNumber, name: "(kosong)", reason: "Nama kosong" });
      return;
    }
    if (!kelasRaw) {
      errors.push({ row: rowNumber, name, reason: "Kelas kosong" });
      return;
    }
    const classId = classByName.get(kelasRaw.toLowerCase());
    if (!classId) {
      errors.push({ row: rowNumber, name, reason: `Kelas "${kelasRaw}" tidak ditemukan` });
      return;
    }
    valid.push({ name, classId });
  });

  if (valid.length === 0) {
    return { success: true, imported: 0, errors };
  }

  // Dua insert massal (bukan loop satu-satu) -- efisien buat berapa pun
  // baris yang diimpor, cuma 2 round-trip ke database.
  const { data: insertedStudents, error: insertError } = await supabase
    .from("students")
    .insert(valid.map((v) => ({ name: v.name, class_id: v.classId })))
    .select("id, class_id");

  if (insertError) return { success: false, error: insertError.message };

  const enrollmentRows = (insertedStudents ?? []).map((s) => ({
    student_id: s.id,
    class_id: s.class_id,
    academic_year_id: activeYear.id,
    status: "aktif" as const,
  }));

  const { error: enrollError } = await supabase.from("student_enrollments").insert(enrollmentRows);
  if (enrollError) {
    return {
      success: false,
      error: `${valid.length} santri kesimpen tapi gagal didaftarin ke tahun ajaran: ${enrollError.message}`,
    };
  }

  return { success: true, imported: valid.length, errors };
}

export type EnrollmentHistoryRow = {
  id: string;
  kelas: string;
  academicYearLabel: string;
  status: string;
};

export async function getStudentHistory(studentId: string): Promise<EnrollmentHistoryRow[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("student_enrollments")
    .select("id, status, classes(kelas), academic_years(label, start_date)")
    .eq("student_id", studentId);

  if (error) throw new Error(error.message);

  const withYear = (data ?? []).map((row) => {
    const kelas = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    const ay = Array.isArray(row.academic_years) ? row.academic_years[0] : row.academic_years;
    return {
      id: row.id,
      kelas: kelas?.kelas ?? "-",
      academicYearLabel: ay?.label ?? "-",
      status: row.status,
      startDate: ay?.start_date ?? "",
    };
  });

  withYear.sort((a, b) => b.startDate.localeCompare(a.startDate));

  return withYear.map(({ id, kelas, academicYearLabel, status }) => ({
    id,
    kelas,
    academicYearLabel,
    status,
  }));
}
