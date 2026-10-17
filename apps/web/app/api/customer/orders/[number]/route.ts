import { requireCustomer } from "@/lib/customer/context";
import { orderView } from "@/lib/customer/order-view";
import { handle, HttpError } from "@/lib/http";

/** The status page's two-second poll: where this customer's order is now. */
export function GET(_request: Request, context: { params: Promise<{ number: string }> }) {
  return handle(async () => {
    const number = Number((await context.params).number);
    if (!Number.isInteger(number)) throw new HttpError(400, "No such order.");
    const { db, customer } = await requireCustomer();
    return Response.json(await orderView(db, customer.id, number), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
