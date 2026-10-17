import { requireShop } from "@/lib/auth/shop";
import { handle } from "@/lib/http";
import { loadShopData } from "@/lib/rotation/load";
import { valueResponse } from "@/lib/rotation/value-response";

/** The value the shop got (spec 11a): late credit recovered and the money cycle shortened. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(valueResponse(await loadShopData(db, shop.id)), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
