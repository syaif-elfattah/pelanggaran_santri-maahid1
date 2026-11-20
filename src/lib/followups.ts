/**
 * Konstanta & helper fitur pembinaan yang dipakai bareng di server dan
 * client. Sengaja BUKAN file "use server" -- file server action cuma boleh
 * ngekspor fungsi async (lihat catatan di lib/pagination.ts).
 */

export type FollowupStatus = "belum" | "sudah" | "data_lama";

export const FOLLOWUP_STATUS_LABEL: Record<FollowupStatus, string> = {
  belum: "Belum dibina",
  sudah: "Sudah dibina",
  data_lama: "Data lama",
};

export const FOLLOWUP_PAGE_SIZE = 50;

/** Nilai khusus di dropdown/chip bentuk pembinaan buat isian bebas. */
export const FOLLOWUP_OTHER = "__LAINNYA__";

export type FollowupInput = {
  labels: string[];
  notes: string;
};

export function roleLabel(role: string | null | undefined): string {
  if (role === "admin") return "Admin";
  if (role === "wali_kelas") return "Wali kelas";
  if (role === "guru") return "Guru";
  return "";
}

/** "Ust. Mahfudz (Wali kelas)" -- atau "-" kalau datanya nggak ada (data lama). */
export function formatActor(name: string | null | undefined, role: string | null | undefined): string {
  if (!name) return "-";
  const r = roleLabel(role);
  return r ? `${name} (${r})` : name;
}

export function formatShortDate(dateAt: string): string {
  return new Date(dateAt + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Bersihin daftar bentuk: trim, buang kosong & dobel (tanpa beda huruf besar/kecil). */
export function cleanLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
