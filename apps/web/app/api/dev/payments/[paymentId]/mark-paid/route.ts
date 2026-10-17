import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { demoMode } from "@/lib/env";
import { handle, HttpError } from "@/lib/http";
import { markPaid } from "@/lib/payments";

/**
 * The stage fallback for A5 when the payment provider cannot be reached: the same mark-paid path
 * as a real callback. Only while DEMO_MODE is on; otherwise this route does not exist.
 */
export function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  return handle(async () => {
    if (!demoMode()) throw new HttpError(404, "Not found.");
    const { paymentId } = await context.params;
    if (!z.uuid().safeParse(paymentId).success) throw new HttpError(404, "No such payment.");
    const { db } = await requireShop(request);
    const moved = await markPaid(db, { id: paymentId }, `demo-${randomUUID()}`, "system");
    return Response.json({ paid: true, already_paid: !moved });
  });
}
