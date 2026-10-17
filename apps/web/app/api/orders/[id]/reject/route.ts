import { z } from "zod";
import { handle, readJson } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";
import { rejectOrder } from "@/lib/owner/decide";

const body = z.object({
  reason: z.enum(["out_of_stock", "shop_closed", "cannot_deliver", "other"]),
});

/** Reject with a reason code, so the customer reads it in their own language. */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { reason } = await readJson(request, body);
    const { db, shop } = await requireOwner();
    await rejectOrder(db, shop.id, (await context.params).id, reason);
    return Response.json({ ok: true });
  });
}
