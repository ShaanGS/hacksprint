import { appEnv } from "@/lib/env";
import { pinMatches } from "@/lib/auth/session";

// Five wrong PINs lock the owner sign-in for 30 seconds, so a judge cannot guess their way in
// on stage. Kept in memory: one shop, one owner, and a restart only shortens a lock.
const MAX_TRIES = 5;
const LOCK_MS = 30_000;

let wrongTries = 0;
let lockedUntil = 0;

export type PinCheck = "ok" | "wrong" | "locked";

export function checkPin(typed: string, now = Date.now()): PinCheck {
  if (now < lockedUntil) return "locked";
  if (pinMatches(typed, appEnv().OWNER_PIN)) {
    wrongTries = 0;
    return "ok";
  }
  wrongTries += 1;
  if (wrongTries >= MAX_TRIES) {
    wrongTries = 0;
    lockedUntil = now + LOCK_MS;
    return "locked";
  }
  return "wrong";
}
