import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError, readJson } from "@/lib/http";
import { keepAside } from "@/lib/loans/tracker";

const body = z.object({ amount_paise: z.number().int().positive().max(2_000_000_000) });

/** He kept money aside tonight for the next EMI, in his own account; we hold nothing. */
export function POST(request: Request, context: { params: Promise<{ payableId: string }> }) {
  return handle(async () => {
    const { payableId } = await context.params;
    if (!z.uuid().safeParse(payableId).success) throw new HttpError(404, "No such EMI.");
    const { amount_paise } = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    await keepAside(db, shop, payableId, amount_paise);
    return Response.json({ ok: true });
  });
}
