import { requireShop } from "@/lib/auth/shop";
import { runBillPay } from "@/lib/bill-pay/run";
import { handle } from "@/lib/http";

/** One bill-pay run: pay or hold for each unpaid bill, and a UPI link for each one to pay. */
export function POST(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(await runBillPay(db, shop.id));
  });
}
