"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createSessionToken, SESSION_COOKIE } from "./session";
import { normalizePhone } from "@/lib/phone";

export type LoginState = { error?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username dan password wajib diisi." };
  }

  const supabase = getSupabaseServer();
  let { data: staff } = await supabase
    .from("staff")
    .select("id, username, password_hash, name, role")
    .eq("username", username)
    .maybeSingle();

  // Kalau username-nya keliatan kayak nomor HP (mengandung selain angka --
  // strip/spasi/awalan 0/dst) dan nggak ketemu persis, coba lagi versi yang
  // udah dinormalisasi -- sama persis logikanya kayak pas akun dibikin di
  // Manajemen Kelas, biar nomor diketik format apapun tetap ketemu akunnya.
  if (!staff) {
    const normalized = normalizePhone(username);
    if (normalized && normalized !== username) {
      const result = await supabase
        .from("staff")
        .select("id, username, password_hash, name, role")
        .eq("username", normalized)
        .maybeSingle();
      staff = result.data;
    }
  }

  if (!staff) {
    return { error: "Username atau password salah." };
  }

  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) {
    return { error: "Username atau password salah." };
  }

  const token = createSessionToken(staff.id, staff.name, staff.role);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect(staff.role === "admin" ? "/dashboard" : "/input-kelas");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
