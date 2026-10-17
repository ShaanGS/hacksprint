import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";
import { checkPayment } from "@/lib/payments/check";

/** Whether a payment link has been paid; a waiting Paytm link is asked about at Paytm (A5). */
export function POST(request: Request, context: { params: Promise<{ paymentId: string }> }) {
  return handle(async () => {
    const { paymentId } = await context.params;
    if (!z.uuid().safeParse(paymentId).success) throw new HttpError(404, "No such payment.");
    const { db, shop } = await requireShop(request);
    return Response.json(await checkPayment(db, shop.id, paymentId));
  });
}
