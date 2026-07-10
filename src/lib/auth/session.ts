import { createHmac } from "crypto";

export const SESSION_COOKIE = "sps_session";
const SEVEN_DAYS_MS = 60 * 60 * 24 * 7 * 1000;

export type SessionPayload = { id: string; name: string; exp: number };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diset di environment variables");
  }
  return secret;
}

export function createSessionToken(id: string, name: string): string {
  const payload: SessionPayload = { id, name, exp: Date.now() + SEVEN_DAYS_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const expectedSig = createHmac("sha256", getSecret()).update(data).digest("base64url");
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
