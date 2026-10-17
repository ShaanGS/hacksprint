import { requireShop } from "@/lib/auth/shop";
import { demoMode } from "@/lib/env";
import { handle } from "@/lib/http";
import { loadShopData } from "@/lib/rotation/load";
import { rotationResponse } from "@/lib/rotation/responses";
import { snapshotOf } from "@/lib/rotation/snapshot";

/** Where the money is (A1) and this week (A2), each part with its source label. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    const data = await loadShopData(db, shop.id);
    return Response.json(rotationResponse(snapshotOf(data), data.now, demoMode()), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
