import { requireShop } from "@/lib/auth/shop";
import { handle } from "@/lib/http";
import { loadFestivalOrder } from "@/lib/rotation/festival";
import { loadShopData } from "@/lib/rotation/load";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { stockResponse } from "@/lib/rotation/stock-responses";

/** The shelf as an estimate (C1): last count plus bills minus usual sales, with days left. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    const data = await loadShopData(db, shop.id);
    const order = await loadFestivalOrder(db, shop.id, data.receipts);
    return Response.json(stockResponse(snapshotOf(data), order), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
