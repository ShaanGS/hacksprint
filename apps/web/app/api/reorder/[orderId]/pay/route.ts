import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";
import { payStockOrder } from "@/lib/reorder/pay";

/** A Paytm test checkout for a sent stock order; it never changes the shop's numbers. */
export function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  return handle(async () => {
    const { orderId } = await context.params;
    if (!z.uuid().safeParse(orderId).success) throw new HttpError(404, "No such order.");
    const { db, shop } = await requireShop(request);
    return Response.json(await payStockOrder(db, shop, orderId));
  });
}
