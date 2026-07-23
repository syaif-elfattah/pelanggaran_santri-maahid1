import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, SESSION_COOKIE, type SessionPayload } from "./session";

/**
 * Dipanggil di tiap page.tsx yang aksesnya dibatasin per role.
 * Ini lapisan kedua (proxy.ts udah mastiin session ada) -- di sini yang
 * dicek adalah ROLE-nya cocok apa nggak sama yang diizinkan halaman ini.
 */
export function requireRole(session: SessionPayload | null, allowed: string[]) {
  if (!session) {
    redirect("/login");
  }
  if (!allowed.includes(session.role)) {
    redirect("/input-kelas");
  }
}

/**
 * Versi buat dipanggil di DALAM server action (bukan page) -- jaga-jaga
 * kalau ada yang manggil aksinya langsung tanpa lewat halaman yang
 * seharusnya ngeblok. Server action nggak bisa redirect kayak page, jadi
 * ini nge-throw error yang bakal ketangkep sebagai pesan error biasa.
 */
export async function requireServerRole(allowed: string[]): Promise<SessionPayload> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) throw new Error("Sesi habis, silakan login ulang.");
  if (!allowed.includes(session.role)) {
    throw new Error("Kamu nggak punya akses buat aksi ini.");
  }
  return session;
}
