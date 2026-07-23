"use server";

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase/server";
import { verifySessionToken, createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export type ResetOwnPasswordResult = { success: true } | { success: false; error: string };

export async function resetAdminPasswordToDefault(): Promise<ResetOwnPasswordResult> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session || session.role !== "admin") {
    return { success: false, error: "Cuma admin yang bisa reset ke default ini." };
  }

  const supabase = getSupabaseServer();
  const passwordHash = await bcrypt.hash("kamtib123", 10);
  const { error } = await supabase.from("staff").update({ password_hash: passwordHash }).eq("id", session.id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export type UpdateAccountResult = { success: true } | { success: false; error: string };

export async function updateAccount(
  currentPassword: string,
  newUsername: string,
  newName: string,
  newPassword: string
): Promise<UpdateAccountResult> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    return { success: false, error: "Sesi kamu udah habis, silakan login ulang." };
  }

  if (!currentPassword) {
    return { success: false, error: "Password saat ini wajib diisi buat konfirmasi." };
  }

  const supabase = getSupabaseServer();
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, username, password_hash, name")
    .eq("id", session.id)
    .single();

  if (error || !staff) {
    return { success: false, error: "Akun tidak ditemukan." };
  }

  const valid = await bcrypt.compare(currentPassword, staff.password_hash);
  if (!valid) {
    return { success: false, error: "Password saat ini salah." };
  }

  const updates: Record<string, string> = {};

  const trimmedUsername = newUsername.trim();
  if (trimmedUsername && trimmedUsername !== staff.username) {
    const { data: existing, error: checkError } = await supabase
      .from("staff")
      .select("id")
      .eq("username", trimmedUsername)
      .neq("id", staff.id)
      .maybeSingle();
    if (checkError) {
      return { success: false, error: "Gagal cek username, coba lagi." };
    }
    if (existing) {
      return { success: false, error: "Username itu udah dipakai staf lain." };
    }
    updates.username = trimmedUsername;
  }

  const trimmedName = newName.trim();
  if (trimmedName && trimmedName !== staff.name) {
    updates.name = trimmedName;
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return { success: false, error: "Password baru minimal 6 karakter." };
    }
    updates.password_hash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "Nggak ada perubahan yang diisi." };
  }

  const { error: updateError } = await supabase.from("staff").update(updates).eq("id", staff.id);
  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Refresh cookie sesi kalau nama berubah, biar langsung kepakai tanpa
  // perlu login ulang buat sesi yang lagi jalan di browser ini.
  const finalName = updates.name ?? staff.name;
  const token = createSessionToken(staff.id, finalName, session.role);
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return { success: true };
}
