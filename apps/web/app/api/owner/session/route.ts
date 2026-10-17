import { z } from "zod";
import { startOwnerSession } from "@/lib/auth/cookies";
import { checkPin } from "@/lib/auth/pin-guard";
import { handle, HttpError, readJson } from "@/lib/http";

const body = z.object({ pin: z.string().regex(/^\d{4}$/) });

/** The owner's PIN, once per phone: a right one signs the phone in for 30 days. */
export function POST(request: Request) {
  return handle(async () => {
    const { pin } = await readJson(request, body);
    const result = checkPin(pin);
    if (result === "locked") throw new HttpError(429, "locked");
    if (result === "wrong") throw new HttpError(401, "wrong");
    await startOwnerSession();
    return Response.json({ ok: true });
  });
}
