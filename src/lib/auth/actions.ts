"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createSessionToken, SESSION_COOKIE } from "./session";

export type LoginState = { error?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Username dan password wajib diisi." };
  }

  const supabase = getSupabaseServer();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, username, password_hash, name")
    .eq("username", username)
    .maybeSingle();

  if (!staff) {
    return { error: "Username atau password salah." };
  }

  const valid = await bcrypt.compare(password, staff.password_hash);
  if (!valid) {
    return { error: "Username atau password salah." };
  }

  const token = createSessionToken(staff.id, staff.name);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/dashboard");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
