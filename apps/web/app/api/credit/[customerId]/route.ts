import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { creditDetail } from "@/lib/credit/detail";
import { handle, HttpError } from "@/lib/http";

/** One customer's credit entries, newest first, each with its source label (E3). */
export function GET(request: Request, context: { params: Promise<{ customerId: string }> }) {
  return handle(async () => {
    const { customerId } = await context.params;
    if (!z.uuid().safeParse(customerId).success) throw new HttpError(404, "No such customer.");
    const { db, shop } = await requireShop(request);
    return Response.json(await creditDetail(db, shop.id, customerId), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
