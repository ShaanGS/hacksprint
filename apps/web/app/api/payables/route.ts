import { requireShop } from "@/lib/auth/shop";
import { handle } from "@/lib/http";
import { payablesResponse } from "@/lib/payables";
import { loadShopData } from "@/lib/rotation/load";

/** Supplier dues, soonest first, with how many days each is overdue. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(payablesResponse(await loadShopData(db, shop.id)), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
