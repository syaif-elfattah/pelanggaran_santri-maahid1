"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
import { requireServerRole } from "@/lib/auth/guard";

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
  await requireServerRole(["admin"]);
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

export type AddStudentResult =
  | { success: true }
  | { success: false; error: string }
  | { success: false; duplicate: true; error: string };

export async function addStudent(
  name: string,
  classId: string,
  confirmDuplicate = false
): Promise<AddStudentResult> {
  await requireServerRole(["admin"]);
  const trimmedName = name.trim();
  if (!trimmedName || !classId) {
    return { success: false, error: "Nama dan kelas wajib diisi." };
  }

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  if (!confirmDuplicate) {
    const { data: dup } = await supabase
      .from("student_enrollments")
      .select("students!inner(name)")
      .eq("class_id", classId)
      .eq("academic_year_id", activeYear.id)
      .eq("status", "aktif")
      .ilike("students.name", trimmedName)
      .maybeSingle();
    if (dup) {
      return {
        success: false,
        duplicate: true,
        error: `Sudah ada santri bernama "${trimmedName}" aktif di kelas ini. Tetap tambahkan?`,
      };
    }
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({ name: trimmedName, class_id: classId })
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
  await requireServerRole(["admin"]);
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

export type ValidatedImportRow = {
  row: number;
  name: string;
  kelas: string;
  classId: string | null;
  status: "valid" | "duplicate" | "error";
  reason: string | null;
};

async function validateImportRows(rows: ImportRow[]): Promise<ValidatedImportRow[]> {
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { data: classes } = await supabase.from("classes").select("id, kelas").eq("is_active", true);
  const classByName = new Map((classes ?? []).map((c) => [c.kelas.trim().toLowerCase(), c.id]));

  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("class_id, students!inner(name)")
    .eq("academic_year_id", activeYear.id)
    .eq("status", "aktif")
    .range(0, 4999);

  const existingByClass = new Map<string, Set<string>>();
  for (const e of enrollments ?? []) {
    const student = Array.isArray(e.students) ? e.students[0] : e.students;
    if (!student?.name) continue;
    const key = e.class_id;
    if (!existingByClass.has(key)) existingByClass.set(key, new Set());
    existingByClass.get(key)!.add(student.name.trim().toLowerCase());
  }

  const seenInBatch = new Map<string, Set<string>>(); // cegah duplikat di dalam file yang sama juga

  return rows
    .map((r, i): ValidatedImportRow | null => {
      const rowNumber = i + 2; // +2: baris 1 = header di Excel
      const name = (r.name ?? "").toString().trim();
      const kelasRaw = (r.kelas ?? "").toString().trim();

      if (!name && !kelasRaw) return null; // baris kosong, lewatin diam-diam

      if (!name) {
        return { row: rowNumber, name: "(kosong)", kelas: kelasRaw, classId: null, status: "error", reason: "Nama kosong" };
      }
      if (!kelasRaw) {
        return { row: rowNumber, name, kelas: kelasRaw, classId: null, status: "error", reason: "Kelas kosong" };
      }
      const classId = classByName.get(kelasRaw.toLowerCase());
      if (!classId) {
        return {
          row: rowNumber,
          name,
          kelas: kelasRaw,
          classId: null,
          status: "error",
          reason: `Kelas "${kelasRaw}" tidak ditemukan`,
        };
      }

      const nameLower = name.toLowerCase();
      const alreadyInBatch = seenInBatch.get(classId)?.has(nameLower);
      const alreadyInDb = existingByClass.get(classId)?.has(nameLower);
      if (alreadyInBatch || alreadyInDb) {
        return {
          row: rowNumber,
          name,
          kelas: kelasRaw,
          classId,
          status: "duplicate",
          reason: alreadyInDb ? "Sudah ada santri aktif dengan nama ini di kelas tsb" : "Nama sama muncul 2x di file ini",
        };
      }

      if (!seenInBatch.has(classId)) seenInBatch.set(classId, new Set());
      seenInBatch.get(classId)!.add(nameLower);

      return { row: rowNumber, name, kelas: kelasRaw, classId, status: "valid", reason: null };
    })
    .filter((r): r is ValidatedImportRow => r !== null);
}

export async function previewImportStudents(rows: ImportRow[]): Promise<ValidatedImportRow[]> {
  await requireServerRole(["admin"]);
  return validateImportRows(rows);
}

export type ImportResult = { success: true; imported: number } | { success: false; error: string };

export async function importStudents(rows: ImportRow[]): Promise<ImportResult> {
  await requireServerRole(["admin"]);
  const validated = await validateImportRows(rows);
  const toImport = validated.filter((r) => r.status === "valid" && r.classId);

  if (toImport.length === 0) {
    return { success: true, imported: 0 };
  }

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  // Dua insert massal (bukan loop satu-satu) -- efisien buat berapa pun
  // baris yang diimpor, cuma 2 round-trip ke database.
  const { data: insertedStudents, error: insertError } = await supabase
    .from("students")
    .insert(toImport.map((v) => ({ name: v.name, class_id: v.classId as string })))
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
      error: `${toImport.length} santri kesimpen tapi gagal didaftarin ke tahun ajaran: ${enrollError.message}`,
    };
  }

  return { success: true, imported: toImport.length };
}

export type ViolationHistoryRow = {
  id: string;
  violation: string;
  severity: "ringan" | "sedang" | "berat" | null;
  dateAt: string;
  kelas: string;
  academicYearLabel: string;
};

export async function getStudentViolationHistory(studentId: string): Promise<ViolationHistoryRow[]> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("violations")
    .select("id, violation, severity, date_at, classes(kelas), academic_years(label)")
    .eq("student_id", studentId)
    .order("date_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const kelas = Array.isArray(row.classes) ? row.classes[0] : row.classes;
    const ay = Array.isArray(row.academic_years) ? row.academic_years[0] : row.academic_years;
    return {
      id: row.id,
      violation: row.violation,
      severity: row.severity ?? null,
      dateAt: row.date_at,
      kelas: kelas?.kelas ?? "-",
      academicYearLabel: ay?.label ?? "-",
    };
  });
}

export type EnrollmentHistoryRow = {
  id: string;
  kelas: string;
  academicYearLabel: string;
  status: string;
};

export async function getStudentHistory(studentId: string): Promise<EnrollmentHistoryRow[]> {
  await requireServerRole(["admin"]);
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
