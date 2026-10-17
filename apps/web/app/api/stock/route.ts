import { requireShop } from "@/lib/auth/shop";
import { handle } from "@/lib/http";
import { loadShopData } from "@/lib/rotation/load";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { stockResponse } from "@/lib/rotation/stock-responses";

/** The shelf as an estimate (C1): last count plus bills minus usual sales, with days left. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(stockResponse(snapshotOf(await loadShopData(db, shop.id))), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
