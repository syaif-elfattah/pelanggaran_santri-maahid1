import { createHmac } from "crypto";

export const SESSION_COOKIE = "sps_session";
// 8 jam -- kira-kira satu hari kerja. Sengaja nggak 7 hari kayak sebelumnya,
// biar sesi yang ketinggalan login di komputer bersama otomatis abis.
// 30 hari -- diperpanjang dari 8 jam biar wali kelas/guru yang akses dari
// HP masing-masing (bukan komputer bersama) nggak perlu login ulang tiap
// beberapa jam pas mau input pelanggaran. Logout manual tetap tersedia di
// sidebar buat yang make perangkat bersama dan mau keluar eksplisit.
const SESSION_DURATION_MS = 60 * 60 * 24 * 30 * 1000;

export type SessionPayload = { id: string; name: string; role: string; exp: number };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diset di environment variables");
  }
  return secret;
}

export function createSessionToken(id: string, name: string, role: string): string {
  const payload: SessionPayload = { id, name, role, exp: Date.now() + SESSION_DURATION_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  // Sengaja dibungkus try/catch total -- ini dipanggil di proxy.ts buat
  // SETIAP request. Kalau ada apa pun yang salah di sini (termasuk env
  // var SESSION_SECRET yang belum keset), lebih baik dianggap "belum
  // login" daripada bikin seluruh situs 500 buat semua orang.
  try {
    if (!token) return null;
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;

    const expectedSig = createHmac("sha256", getSecret()).update(data).digest("base64url");
    if (sig !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    if (!payload.role || !["admin", "wali_kelas", "guru"].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}
