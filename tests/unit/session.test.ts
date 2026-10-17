import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession, pinMatches } from "@/lib/auth/session";

const SECRET = "test-session-secret-at-least-32-characters";
const LATER = Date.now() + 60_000;

describe("signed sessions", () => {
  it("reads back what it signed", () => {
    const token = encodeSession({ kind: "customer", customerId: "c1", exp: LATER }, SECRET);
    expect(decodeSession(token, SECRET)).toEqual({
      kind: "customer",
      customerId: "c1",
      exp: LATER,
    });
  });

  it("rejects a session someone edited", () => {
    const token = encodeSession({ kind: "customer", customerId: "c1", exp: LATER }, SECRET);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ kind: "owner", exp: LATER })).toString("base64url");
    expect(decodeSession(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it("rejects another secret, an expired session and junk", () => {
    const token = encodeSession({ kind: "owner", exp: LATER }, SECRET);
    expect(decodeSession(token, "another-secret-that-is-also-32-chars-long")).toBeNull();
    expect(decodeSession(encodeSession({ kind: "owner", exp: 1 }, SECRET), SECRET)).toBeNull();
    expect(decodeSession("not-a-session", SECRET)).toBeNull();
  });
});

describe("PIN check", () => {
  it("matches only the exact PIN", () => {
    expect(pinMatches("4321", "4321")).toBe(true);
    expect(pinMatches("4320", "4321")).toBe(false);
    expect(pinMatches("43210", "4321")).toBe(false);
  });
});
