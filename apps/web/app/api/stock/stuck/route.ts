import { requireShop } from "@/lib/auth/shop";
import { handle } from "@/lib/http";
import { loadShopData } from "@/lib/rotation/load";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { stuckResponse } from "@/lib/rotation/stock-responses";

/** Money stuck in slow stock (C2): what lasts over 30 days or does not move; not to reorder now. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(stuckResponse(snapshotOf(await loadShopData(db, shop.id))), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
