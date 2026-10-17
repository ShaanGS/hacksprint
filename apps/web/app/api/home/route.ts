import { homeNumbers } from "@/lib/home";
import { handle } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";
import { startOfShopDay } from "@/lib/time";

/** The owner's home numbers (spec E1): orders saved, collected, owed to and by the shop. */
export function GET() {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    return Response.json(await homeNumbers(db, shop.id, startOfShopDay()), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
