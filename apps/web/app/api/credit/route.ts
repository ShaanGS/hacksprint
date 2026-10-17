import { requireShop } from "@/lib/auth/shop";
import { handle } from "@/lib/http";
import { openReminders } from "@/lib/reminders/remind";
import { loadShopData } from "@/lib/rotation/load";
import { customerRow } from "@/lib/rotation/responses";
import { snapshotOf } from "@/lib/rotation/snapshot";

/** The credit book: everyone who owes, most first, each with their habit and source label. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    const [data, reminders] = await Promise.all([
      loadShopData(db, shop.id),
      openReminders(db, shop.id),
    ]);
    const { positions, withCustomers } = snapshotOf(data);
    return Response.json(
      {
        total_paise: withCustomers.paise,
        label: withCustomers.label,
        customers: [...positions]
          .sort((a, b) => b.balancePaise - a.balancePaise)
          .map((p) => customerRow(p, reminders.get(p.customerId) ?? null)),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
}
