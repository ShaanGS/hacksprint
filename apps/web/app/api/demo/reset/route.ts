import { requireShop } from "@/lib/auth/shop";
import { resetDemo } from "@/lib/demo/reset";
import { demoMode } from "@/lib/env";
import { handle, HttpError } from "@/lib/http";

/** Restores the demo shop; only while DEMO_MODE is on. */
export function POST(request: Request) {
  return handle(async () => {
    if (!demoMode()) throw new HttpError(404, "Not found.");
    const { db } = await requireShop(request);
    await resetDemo(db);
    return Response.json({ ok: true });
  });
}
