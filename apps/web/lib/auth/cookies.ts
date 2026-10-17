import { cookies } from "next/headers";
import { appEnv } from "@/lib/env";
import { decodeSession, encodeSession, type Session } from "@/lib/auth/session";

const OWNER_COOKIE = "owner_session";
const CUSTOMER_COOKIE = "customer_session";
const DAY_MS = 24 * 60 * 60 * 1000;

async function write(name: string, session: Session) {
  const store = await cookies();
  store.set(name, encodeSession(session, appEnv().SESSION_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.exp),
  });
}

async function read(name: string): Promise<Session | null> {
  const value = (await cookies()).get(name)?.value;
  return value ? decodeSession(value, appEnv().SESSION_SECRET) : null;
}

export async function startOwnerSession() {
  await write(OWNER_COOKIE, { kind: "owner", exp: Date.now() + 30 * DAY_MS });
}

export async function isOwner(): Promise<boolean> {
  return (await read(OWNER_COOKIE))?.kind === "owner";
}

export async function startCustomerSession(customerId: string) {
  await write(CUSTOMER_COOKIE, { kind: "customer", customerId, exp: Date.now() + 90 * DAY_MS });
}

/** The signed-in customer's id, or null. */
export async function currentCustomerId(): Promise<string | null> {
  const session = await read(CUSTOMER_COOKIE);
  return session?.kind === "customer" ? session.customerId : null;
}
