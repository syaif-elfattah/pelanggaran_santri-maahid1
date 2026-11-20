"use server";

import { getSupabaseServer } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/guard";
import { cleanLabels, FOLLOWUP_PAGE_SIZE } from "@/lib/followups";

const ALL_ROLES = ["admin", "wali_kelas", "guru"];

type ActionResult = { success: true } | { success: false; error: string };

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/** Escape karakter wildcard ilike biar pencarian nama dianggap teks biasa. */
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// ---------------------------------------------------------------------------
// Bentuk pembinaan (pilihan di form)
// ---------------------------------------------------------------------------

export type FollowupType = { id: string; label: string };

export async function getFollowupTypes(): Promise<FollowupType[]> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("followup_types")
    .select("id, label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Jumlah pelanggaran yang belum dibina -- angka di menu samping & Dashboard. */
export async function getPendingFollowupCount(): Promise<number> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.rpc("count_pending_followups");
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

// ---------------------------------------------------------------------------
// Daftar pembinaan (menu Pembinaan)
// ---------------------------------------------------------------------------

export type FollowupRecord = {
  id: string;
  labels: string[];
  doneAt: string;
  notes: string | null;
  isDirect: boolean;
  staffName: string;
  staffRole: string | null;
  canDelete: boolean;
};

export type FollowupQueueRow = {
  id: string;
  studentName: string;
  kelas: string;
  violation: string;
  severity: "ringan" | "sedang" | "berat" | null;
  dateAt: string;
  timeAt: string | null;
  notes: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  followups: FollowupRecord[];
};

export type FollowupQueueFilters = {
  status: "belum" | "sudah";
  classIds?: string[];
  severity?: string;
  search?: string;
};

export type FollowupQueuePage = {
  rows: FollowupQueueRow[];
  totalCount: number;
  pendingCount: number;
  doneCount: number;
};

type QueueViewRow = {
  id: string;
  student_name: string;
  kelas: string;
  violation: string;
  severity: "ringan" | "sedang" | "berat" | null;
  date_at: string;
  time_at: string | null;
  notes: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
};

export async function getFollowupQueue(filters: FollowupQueueFilters, page = 1): Promise<FollowupQueuePage> {
  const session = await requireServerRole(ALL_ROLES);
  const supabase = getSupabaseServer();

  // Cuma pelanggaran yang dilacak (diinput setelah fitur ini aktif) --
  // data lama nggak pernah masuk daftar ini.
  const base = (status: "belum" | "sudah", head: boolean) => {
    let query = supabase
      .from("violations_report")
      .select(
        "id, student_name, kelas, violation, severity, date_at, time_at, notes, created_by_name, created_by_role",
        { count: "exact", head }
      )
      .eq("followup_tracked", true)
      .eq("followup_status", status);

    if (filters.classIds && filters.classIds.length > 0) query = query.in("class_id", filters.classIds);
    if (filters.severity) query = query.eq("severity", filters.severity);
    if (filters.search && filters.search.trim()) {
      query = query.ilike("student_name", `%${escapeLike(filters.search.trim())}%`);
    }
    return query;
  };

  const from = (page - 1) * FOLLOWUP_PAGE_SIZE;
  const other = filters.status === "belum" ? "sudah" : "belum";

  // Belum dibina: yang paling lama menunggu di atas. Sudah dibina: yang
  // paling baru dibina di atas.
  const mainQuery =
    filters.status === "belum"
      ? base("belum", false)
          .order("date_at", { ascending: true })
          .order("time_at", { ascending: true, nullsFirst: false })
          .order("id", { ascending: true })
      : base("sudah", false)
          .order("followup_done_at", { ascending: false })
          .order("date_at", { ascending: false })
          .order("id", { ascending: true });

  const [mainRes, otherRes] = await Promise.all([
    mainQuery.range(from, from + FOLLOWUP_PAGE_SIZE - 1),
    base(other, true),
  ]);

  if (mainRes.error) throw new Error(mainRes.error.message);
  if (otherRes.error) throw new Error(otherRes.error.message);

  const viewRows = (mainRes.data ?? []) as QueueViewRow[];
  const ids = viewRows.map((r) => r.id);

  // Catatan pembinaan lengkap cuma perlu di tab "Sudah dibina".
  const followupsByViolation = new Map<string, FollowupRecord[]>();
  if (filters.status === "sudah" && ids.length > 0) {
    const { data, error } = await supabase
      .from("violation_followups")
      .select("id, violation_id, labels, done_at, notes, is_direct, staff_id, staff_name, staff_role")
      .in("violation_id", ids)
      .order("done_at", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    for (const f of data ?? []) {
      const list = followupsByViolation.get(f.violation_id) ?? [];
      list.push({
        id: f.id,
        labels: f.labels ?? [],
        doneAt: f.done_at,
        notes: f.notes,
        isDirect: f.is_direct,
        staffName: f.staff_name,
        staffRole: f.staff_role,
        canDelete: session.role === "admin" || f.staff_id === session.id,
      });
      followupsByViolation.set(f.violation_id, list);
    }
  }

  const mainCount = mainRes.count ?? 0;
  const otherCount = otherRes.count ?? 0;

  return {
    rows: viewRows.map((r) => ({
      id: r.id,
      studentName: r.student_name,
      kelas: r.kelas,
      violation: r.violation,
      severity: r.severity ?? null,
      dateAt: r.date_at,
      timeAt: r.time_at,
      notes: r.notes,
      createdByName: r.created_by_name,
      createdByRole: r.created_by_role,
      followups: followupsByViolation.get(r.id) ?? [],
    })),
    totalCount: mainCount,
    pendingCount: filters.status === "belum" ? mainCount : otherCount,
    doneCount: filters.status === "sudah" ? mainCount : otherCount,
  };
}

/**
 * Catat pembinaan menyusul untuk satu atau banyak pelanggaran sekaligus.
 * Pembinanya = akun yang sedang login.
 */
export async function addFollowups(
  violationIds: string[],
  input: { labels: string[]; doneAt: string; notes: string }
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  let session;
  try {
    session = await requireServerRole(ALL_ROLES);
  } catch (e) {
    return { success: false, error: errorMessage(e, "Sesi habis, silakan login ulang.") };
  }

  const labels = cleanLabels(input.labels);
  if (labels.length === 0) return { success: false, error: "Pilih minimal satu bentuk pembinaan." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.doneAt)) return { success: false, error: "Tanggal pembinaan belum diisi." };

  const ids = Array.from(new Set(violationIds)).slice(0, 500);
  if (ids.length === 0) return { success: false, error: "Belum ada pelanggaran yang dipilih." };

  const supabase = getSupabaseServer();

  // Pastikan pelanggarannya ada & memang dilacak (bukan data lama).
  const { data: valid, error: checkError } = await supabase
    .from("violations")
    .select("id")
    .in("id", ids)
    .eq("followup_tracked", true);
  if (checkError) return { success: false, error: checkError.message };
  if (!valid || valid.length === 0) return { success: false, error: "Pelanggaran yang dipilih tidak ditemukan." };

  const rows = valid.map((v) => ({
    violation_id: v.id,
    labels,
    done_at: input.doneAt,
    notes: input.notes.trim() || null,
    is_direct: false,
    staff_id: session.id,
    staff_name: session.name,
    staff_role: session.role,
  }));

  const { error } = await supabase.from("violation_followups").insert(rows);
  if (error) return { success: false, error: error.message };

  return { success: true, count: rows.length };
}

/** Admin bisa hapus catatan siapa pun; yang lain cuma catatannya sendiri. */
export async function deleteFollowup(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireServerRole(ALL_ROLES);
  } catch (e) {
    return { success: false, error: errorMessage(e, "Sesi habis, silakan login ulang.") };
  }

  const supabase = getSupabaseServer();
  const { data: followup, error: findError } = await supabase
    .from("violation_followups")
    .select("staff_id")
    .eq("id", id)
    .maybeSingle();
  if (findError) return { success: false, error: findError.message };
  if (!followup) return { success: false, error: "Catatan pembinaan tidak ditemukan." };

  if (session.role !== "admin" && followup.staff_id !== session.id) {
    return { success: false, error: "Kamu cuma bisa menghapus catatan pembinaan yang kamu isi sendiri." };
  }

  const { error } = await supabase.from("violation_followups").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Kelola bentuk pembinaan (khusus admin, di Pengaturan)
// ---------------------------------------------------------------------------

export type FollowupTypesResult = { success: true; types: FollowupType[] } | { success: false; error: string };

async function withAdmin(fn: () => Promise<FollowupTypesResult>): Promise<FollowupTypesResult> {
  try {
    await requireServerRole(["admin"]);
  } catch (e) {
    return { success: false, error: errorMessage(e, "Kamu nggak punya akses buat aksi ini.") };
  }
  try {
    return await fn();
  } catch (e) {
    return { success: false, error: errorMessage(e, "Terjadi kesalahan.") };
  }
}

function normalizeLabel(label: string) {
  return label.trim().replace(/\s+/g, " ");
}

async function nextSortOrder(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data } = await supabase
    .from("followup_types")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 1;
}

export async function addFollowupType(rawLabel: string): Promise<FollowupTypesResult> {
  return withAdmin(async () => {
    const label = normalizeLabel(rawLabel);
    if (!label) return { success: false, error: "Tulis nama bentuk pembinaan dulu." };
    if (label.length > 80) return { success: false, error: "Nama bentuk terlalu panjang (maksimal 80 huruf)." };

    const supabase = getSupabaseServer();
    const { data: all, error } = await supabase.from("followup_types").select("id, label, is_active");
    if (error) throw new Error(error.message);

    const existing = (all ?? []).find((t) => t.label.toLowerCase() === label.toLowerCase());
    if (existing && existing.is_active) return { success: false, error: "Bentuk itu sudah ada di daftar." };

    const sortOrder = await nextSortOrder(supabase);
    const { error: saveError } = existing
      ? // Pernah dihapus -> aktifkan lagi, taruh di urutan terakhir.
        await supabase
          .from("followup_types")
          .update({ is_active: true, label, sort_order: sortOrder })
          .eq("id", existing.id)
      : await supabase.from("followup_types").insert({ label, sort_order: sortOrder });
    if (saveError) throw new Error(saveError.message);

    return { success: true, types: await getFollowupTypes() };
  });
}

export async function renameFollowupType(id: string, rawLabel: string): Promise<FollowupTypesResult> {
  return withAdmin(async () => {
    const label = normalizeLabel(rawLabel);
    if (!label) return { success: false, error: "Nama bentuk tidak boleh kosong." };
    if (label.length > 80) return { success: false, error: "Nama bentuk terlalu panjang (maksimal 80 huruf)." };

    const supabase = getSupabaseServer();
    const { data: all, error } = await supabase.from("followup_types").select("id, label, is_active");
    if (error) throw new Error(error.message);

    const clash = (all ?? []).find((t) => t.id !== id && t.label.toLowerCase() === label.toLowerCase());
    if (clash) {
      return {
        success: false,
        error: clash.is_active
          ? "Bentuk itu sudah ada di daftar."
          : "Nama itu pernah dipakai bentuk yang sudah dihapus. Tambahkan lewat kolom Tambah untuk memakainya lagi.",
      };
    }

    const { error: saveError } = await supabase.from("followup_types").update({ label }).eq("id", id);
    if (saveError) throw new Error(saveError.message);

    return { success: true, types: await getFollowupTypes() };
  });
}

/** Cuma disembunyikan dari pilihan -- catatan lama tetap menyimpan namanya. */
export async function deleteFollowupType(id: string): Promise<FollowupTypesResult> {
  return withAdmin(async () => {
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("followup_types").update({ is_active: false }).eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true, types: await getFollowupTypes() };
  });
}

export async function moveFollowupType(id: string, direction: "up" | "down"): Promise<FollowupTypesResult> {
  return withAdmin(async () => {
    const types = await getFollowupTypes();
    const index = types.findIndex((t) => t.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= types.length) return { success: true, types };

    const reordered = [...types];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Tulis ulang urutan semua bentuk aktif jadi 1, 2, 3, ... biar rapi.
    const supabase = getSupabaseServer();
    const results = await Promise.all(
      reordered.map((t, i) => supabase.from("followup_types").update({ sort_order: i + 1 }).eq("id", t.id))
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);

    return { success: true, types: reordered };
  });
}

export type FollowupSuggestion = { label: string; count: number };

/**
 * Isian "Lainnya" yang sering ditulis petugas tapi belum ada di daftar --
 * biar admin gampang menjadikannya pilihan tetap.
 */
export async function getFollowupSuggestions(): Promise<FollowupSuggestion[]> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();

  const [typesRes, followupsRes] = await Promise.all([
    supabase.from("followup_types").select("label").eq("is_active", true),
    supabase.from("violation_followups").select("labels").order("created_at", { ascending: false }).limit(3000),
  ]);
  if (typesRes.error) throw new Error(typesRes.error.message);
  if (followupsRes.error) throw new Error(followupsRes.error.message);

  const known = new Set((typesRes.data ?? []).map((t) => t.label.toLowerCase()));
  const counts = new Map<string, FollowupSuggestion>();
  for (const row of followupsRes.data ?? []) {
    for (const raw of row.labels ?? []) {
      const label = normalizeLabel(raw);
      const key = label.toLowerCase();
      if (!label || known.has(key)) continue;
      const entry = counts.get(key) ?? { label, count: 0 };
      entry.count++;
      counts.set(key, entry);
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 10);
}
