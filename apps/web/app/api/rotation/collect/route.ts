import { requireShop } from "@/lib/auth/shop";
import { handle } from "@/lib/http";
import { openReminders } from "@/lib/reminders/remind";
import { loadShopData } from "@/lib/rotation/load";
import { collectResponse } from "@/lib/rotation/responses";
import { snapshotOf } from "@/lib/rotation/snapshot";

/** Who to collect from first, with the reason for each (A3, spec 9.8). */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    const [data, reminders] = await Promise.all([
      loadShopData(db, shop.id),
      openReminders(db, shop.id),
    ]);
    return Response.json(collectResponse(snapshotOf(data), reminders), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}
