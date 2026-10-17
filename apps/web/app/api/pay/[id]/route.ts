import { randomUUID } from "node:crypto";
import { handle, HttpError } from "@/lib/http";
import { markPaid } from "@/lib/payments";
import { paymentView } from "@/lib/payments/view";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Pays a link on our own test payment page, until Paytm keys are in. Only test payments can be
 * paid here; a Paytm link is paid on Paytm and confirmed by its callback.
 */
export function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const db = createServiceClient();
    const payment = await paymentView(db, (await context.params).id);
    if (!payment || payment.provider !== "test") throw new HttpError(404, "No such payment.");
    const moved = await markPaid(db, { id: payment.id }, `test-${randomUUID()}`, "customer");
    return Response.json({ paid: true, alreadyPaid: !moved });
  });
}
