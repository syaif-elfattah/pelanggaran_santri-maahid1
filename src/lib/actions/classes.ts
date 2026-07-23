"use server";

import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/data/academic-year";

const DEFAULT_PASSWORD = "@12345";

function normalizePhoneForUsername(phone: string): string {
  return phone.replace(/\D/g, "");
}

export type ClassManagementRow = {
  id: string;
  kelas: string;
  isActive: boolean;
  homeroomTeacherId: string | null;
  homeroomTeacherName: string | null;
  homeroomTeacherPhone: string | null;
};

export async function getClassesManagement(): Promise<ClassManagementRow[]> {
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
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("classes").update({ is_active: isActive }).eq("id", classId);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteClass(classId: string): Promise<ActionResult> {
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

export async function assignHomeroomTeacher(
  classId: string,
  name: string,
  phone: string
): Promise<ActionResult> {
  const trimmedName = name.trim();
  if (!trimmedName) return { success: false, error: "Nama wali kelas wajib diisi." };

  const supabase = getSupabaseServer();
  const activeYear = await getActiveAcademicYear();
  const trimmedPhone = phone.trim();

  let staffId: string | null = null;

  if (trimmedPhone) {
    const username = normalizePhoneForUsername(trimmedPhone);
    if (!username) {
      return { success: false, error: "Nomor HP nggak valid, coba cek lagi." };
    }

    const { data: existingStaff, error: staffLookupError } = await supabase
      .from("staff")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (staffLookupError) return { success: false, error: staffLookupError.message };

    if (existingStaff) {
      staffId = existingStaff.id;
    } else {
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      const { data: newStaff, error: createError } = await supabase
        .from("staff")
        .insert({ username, password_hash: passwordHash, name: trimmedName, role: "wali_kelas" })
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
        phone: trimmedPhone || null,
        staff_id: staffId,
      },
      { onConflict: "class_id,academic_year_id" }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}
