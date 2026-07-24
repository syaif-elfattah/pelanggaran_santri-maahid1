"use server";

import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";
import { normalizePhone } from "@/lib/phone";
import { requireServerRole } from "@/lib/auth/guard";

const DEFAULT_PASSWORD = "@12345";

export type ClassManagementRow = {
  id: string;
  kelas: string;
  isActive: boolean;
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
  homeroomTeacherPhone: string | null;
};

export async function getClassesManagement(): Promise<ClassManagementRow[]> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();

  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, kelas, is_active")
    .order("kelas", { ascending: true });

  if (error) throw new Error(error.message);

  const { data: teachers, error: teacherError } = await supabase
    .from("homeroom_teachers")
    .select("id, class_id, name, phone")
    .eq("academic_year_id", activeYear.id);

  if (teacherError) throw new Error(teacherError.message);

  const teacherByClass = new Map((teachers ?? []).map((t) => [t.class_id, t]));

  return (classes ?? []).map((c) => {
    const teacher = teacherByClass.get(c.id);
    return {
      id: c.id,
      kelas: c.kelas,
      isActive: c.is_active,
      homeroomTeacherId: teacher?.id ?? null,
      homeroomTeacherName: teacher?.name ?? null,
      homeroomTeacherPhone: teacher?.phone ?? null,
    };
  });
}

export type ActionResult = { success: true } | { success: false; error: string };

export async function addClass(kelas: string): Promise<ActionResult> {
  await requireServerRole(["admin"]);
  const trimmed = kelas.trim();
  if (!trimmed) return { success: false, error: "Nama kelas wajib diisi." };

  const supabase = getSupabaseServer();

  const { data: existing } = await supabase
    .from("classes")
    .select("id")
    .ilike("kelas", trimmed)
    .maybeSingle();
  if (existing) {
    return { success: false, error: `Kelas "${trimmed}" udah ada.` };
  }

  const { error } = await supabase.from("classes").insert({ kelas: trimmed, name: trimmed });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function setClassActive(classId: string, isActive: boolean): Promise<ActionResult> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("classes").update({ is_active: isActive }).eq("id", classId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteClass(classId: string): Promise<ActionResult> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();

  const [{ count: enrollCount }, { count: violationCount }, { count: teacherCount }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("id", { count: "exact", head: true })
      .eq("class_id", classId),
    supabase.from("violations").select("id", { count: "exact", head: true }).eq("class_id", classId),
    supabase.from("homeroom_teachers").select("id", { count: "exact", head: true }).eq("class_id", classId),
  ]);

  if ((enrollCount ?? 0) > 0 || (violationCount ?? 0) > 0 || (teacherCount ?? 0) > 0) {
    return {
      success: false,
      error:
        "Kelas ini pernah punya data santri/pelanggaran/wali kelas, nggak bisa dihapus permanen. Nonaktifkan aja biar histori laporannya tetap utuh.",
    };
  }

  const { error } = await supabase.from("classes").delete().eq("id", classId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resetAllWaliKelasPasswords(): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  await requireServerRole(["admin"]);

  const supabase = getSupabaseServer();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const { data, error } = await supabase
    .from("staff")
    .update({ password_hash: passwordHash })
    .eq("role", "wali_kelas")
    .select("id");

  if (error) return { success: false, error: error.message };
  return { success: true, count: data?.length ?? 0 };
}

export async function assignHomeroomTeacher(
  classId: string,
  name: string,
  phone: string
): Promise<ActionResult> {
  await requireServerRole(["admin"]);
  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: "Nama wali kelas wajib diisi." };

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();
  // Nomor HP disimpen dalam bentuk angka-doang (nggak ada strip/spasi) --
  // biar yang ditampilin di Manajemen Kelas PERSIS sama kayak username
  // login-nya, nggak ada beda format pas mau di-share ke wali kelasnya.
  const normalizedPhone = normalizePhone(phone);

  let staffId: string | null = null;

  if (normalizedPhone) {
    const { data: existingStaff, error: staffLookupError } = await supabase
      .from("staff")
      .select("id")
      .eq("username", normalizedPhone)
      .maybeSingle();

    if (staffLookupError) return { success: false, error: staffLookupError.message };

    if (existingStaff) {
      staffId = existingStaff.id;
    } else {
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const { data: newStaff, error: createError } = await supabase
        .from("staff")
        .insert({ username: normalizedPhone, password_hash: passwordHash, name: trimmedName, role: "wali_kelas" })
        .select("id")
        .single();

      if (createError || !newStaff) {
        return {
          success: false,
          error: createError?.message ?? "Gagal membuat akun wali kelas otomatis.",
        };
      }
      staffId = newStaff.id;
    }
  }

  // Kalau nomor HP kosong, staffId tetap null -- sengaja, biar akun login
  // nggak kebuat sama sekali dan otomatis nggak bisa login.
  const { error } = await supabase
    .from("homeroom_teachers")
    .upsert(
      {
        class_id: classId,
        academic_year_id: activeYear.id,
        name: trimmedName,
        phone: normalizedPhone || null,
        staff_id: staffId,
      },
      { onConflict: "class_id,academic_year_id" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export type ClassImportRow = { kelas: string; waliName: string; waliPhone: string };

export type ValidatedClassImportRow = {
  row: number;
  kelas: string;
  waliName: string;
  waliPhone: string;
  status: "new" | "update" | "error";
  reason: string | null;
};

export async function previewImportClasses(rows: ClassImportRow[]): Promise<ValidatedClassImportRow[]> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();

  const { data: existingClasses } = await supabase.from("classes").select("kelas");
  const existingSet = new Set((existingClasses ?? []).map((c) => c.kelas.trim().toLowerCase()));

  return rows
    .map((r, i): ValidatedClassImportRow | null => {
      const rowNumber = i + 2; // +2: baris 1 = header di Excel
      const kelas = (r.kelas ?? "").toString().trim();
      const waliName = (r.waliName ?? "").toString().trim();
      const waliPhone = (r.waliPhone ?? "").toString().trim();

      if (!kelas && !waliName && !waliPhone) return null; // baris kosong, lewatin diam-diam

      if (!kelas) {
        return { row: rowNumber, kelas: "(kosong)", waliName, waliPhone, status: "error", reason: "Nama kelas kosong" };
      }

      const exists = existingSet.has(kelas.toLowerCase());
      return {
        row: rowNumber,
        kelas,
        waliName,
        waliPhone,
        status: exists ? "update" : "new",
        reason: exists ? "Kelas udah ada -- wali kelasnya bakal ditimpa/diisi" : null,
      };
    })
    .filter((r): r is ValidatedClassImportRow => r !== null);
}

export type ImportClassesResult =
  | { success: true; created: number; updated: number }
  | { success: false; error: string };

export async function importClasses(rows: ClassImportRow[]): Promise<ImportClassesResult> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();

  let created = 0;
  let updated = 0;

  for (const r of rows) {
    const kelas = (r.kelas ?? "").toString().trim();
    if (!kelas) continue;

    const { data: existing } = await supabase.from("classes").select("id").ilike("kelas", kelas).maybeSingle();

    let classId: string;
    if (existing) {
      classId = existing.id;
      updated++;
    } else {
      const { data: newClass, error: createError } = await supabase
        .from("classes")
        .insert({ kelas, name: kelas })
        .select("id")
        .single();
      if (createError || !newClass) {
        return { success: false, error: `Gagal bikin kelas "${kelas}": ${createError?.message ?? "unknown error"}` };
      }
      classId = newClass.id;
      created++;
    }

    const waliName = (r.waliName ?? "").toString().trim();
    if (waliName) {
      // Pakai fungsi yang sama kayak "Atur wali kelas" satu-satu -- biar
      // perilakunya (normalisasi nomor, auto-bikin akun login) konsisten,
      // nggak ada logika kedua yang bisa beda sendiri.
      const result = await assignHomeroomTeacher(classId, waliName, (r.waliPhone ?? "").toString().trim());
      if (!result.success) {
        return { success: false, error: `Gagal atur wali kelas "${kelas}": ${result.error}` };
      }
    }
  }

  return { success: true, created, updated };
}
