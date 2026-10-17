import { z } from "zod";
import { requireCustomer } from "@/lib/customer/context";
import { handle, HttpError, readJson } from "@/lib/http";
import { findDraftId } from "@/lib/orders/cart";
import { submitOrder } from "@/lib/orders/submit";

const body = z.object({ paymentMode: z.enum(["link", "credit"]) });

/** The review sheet's Send: the order goes to the owner for approval. */
export function POST(request: Request) {
  return handle(async () => {
    const { paymentMode } = await readJson(request, body);
    const { db, customer } = await requireCustomer();
    const orderId = await findDraftId(db, customer.id);
    if (!orderId) throw new HttpError(409, "There is no open order.");
    const result = await submitOrder(db, orderId, paymentMode);
    if (!result.ok)
      throw new HttpError(
        409,
        result.reason === "empty" ? "The order is empty." : "This order was already sent.",
      );
    return Response.json({ number: result.number });
  });
}
