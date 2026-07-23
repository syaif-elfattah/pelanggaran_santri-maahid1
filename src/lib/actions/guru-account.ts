"use server";

import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireServerRole } from "@/lib/auth/guard";

export type GuruAccount = { username: string } | null;

export async function getGuruAccount(): Promise<GuruAccount> {
  await requireServerRole(["admin"]);
  const supabase = getSupabaseServer();
  const { data } = await supabase.from("staff").select("username").eq("role", "guru").maybeSingle();
  return data ?? null;
}

export type UpdateGuruAccountResult = { success: true } | { success: false; error: string };

export async function resetGuruPasswordToDefault(): Promise<UpdateGuruAccountResult> {
  const supabase = getSupabaseServer();

  const { data: guruAccount } = await supabase.from("staff").select("id").eq("role", "guru").maybeSingle();
  if (!guruAccount) {
    return { success: false, error: "Belum ada akun guru yang dibuat." };
  }

  const passwordHash = await bcrypt.hash("guru123", 10);
  const { error } = await supabase.from("staff").update({ password_hash: passwordHash }).eq("id", guruAccount.id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function updateGuruAccount(
  username: string,
  password: string
): Promise<UpdateGuruAccountResult> {
  await requireServerRole(["admin"]);
  const trimmedUsername = username.trim();
  if (!trimmedUsername) return { success: false, error: "Username wajib diisi." };
  if (password && password.length < 6) {
    return { success: false, error: "Password minimal 6 karakter." };
  }

  const supabase = getSupabaseServer();

  const { data: guruAccount } = await supabase.from("staff").select("id").eq("role", "guru").maybeSingle();

  const { data: usernameTaken } = await supabase
    .from("staff")
    .select("id")
    .eq("username", trimmedUsername)
    .neq("id", guruAccount?.id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (usernameTaken) {
    return { success: false, error: "Username itu udah dipakai akun lain." };
  }

  if (guruAccount) {
    const updates: { username: string; password_hash?: string } = { username: trimmedUsername };
    if (password) updates.password_hash = await bcrypt.hash(password, 10);

    const { error } = await supabase.from("staff").update(updates).eq("id", guruAccount.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  if (!password) {
    return { success: false, error: "Password wajib diisi buat bikin akun guru baru." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { error } = await supabase
    .from("staff")
    .insert({ username: trimmedUsername, password_hash: passwordHash, name: "Guru", role: "guru" });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
