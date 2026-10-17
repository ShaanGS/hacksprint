import { createHmac, timingSafeEqual } from "node:crypto";

// A session is "<payload>.<signature>": base64url JSON, signed with SESSION_SECRET. The browser
// keeps it in an httpOnly cookie and can show it to us, but cannot change it.

export type Session =
  { kind: "owner"; exp: number } | { kind: "customer"; customerId: string; exp: number };

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function encodeSession(session: Session, secret: string): string {
  const data = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

/** The session inside a cookie value, or null if it is forged, malformed or expired. */
export function decodeSession(token: string, secret: string, now = Date.now()): Session | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(data, "base64url").toString()) as Session;
    return session.exp > now ? session : null;
  } catch {
    return null;
  }
}

/** Compares a typed PIN with the real one in constant time. */
export function pinMatches(typed: string, pin: string): boolean {
  const a = Buffer.from(typed);
  const b = Buffer.from(pin);
  return a.length === b.length && timingSafeEqual(a, b);
}
