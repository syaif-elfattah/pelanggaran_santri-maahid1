import { redirect } from "next/navigation";
import type { SessionPayload } from "./session";

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
