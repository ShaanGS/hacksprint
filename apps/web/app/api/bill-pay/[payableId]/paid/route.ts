import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { billPaid } from "@/lib/bill-pay/paid";
import { handle, HttpError, readJson } from "@/lib/http";

const body = z.object({ run_id: z.uuid() });

/** The owner paid this bill from his UPI app under a bill-pay run (his word, owner_said). */
export function POST(request: Request, context: { params: Promise<{ payableId: string }> }) {
  return handle(async () => {
    const { payableId } = await context.params;
    if (!z.uuid().safeParse(payableId).success) throw new HttpError(404, "No such bill.");
    const { run_id } = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    return Response.json(await billPaid(db, shop.id, { payableId, runId: run_id }));
  });
}
