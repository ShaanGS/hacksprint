import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, readJson } from "@/lib/http";
import { reorderPlanFor, reorderResponse } from "@/lib/reorder/plan";
import { sendReorder } from "@/lib/reorder/send";

const body = z.object({
  distributor_id: z.uuid(),
  product_ids: z.array(z.uuid()).min(1),
});

/** The reorder agent's list: what runs out this week, at the last bill's quantity and price. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(reorderResponse(await reorderPlanFor(db, shop.id)));
  });
}

/** The owner approved the lines for one distributor: save the order and email it through n8n. */
export function POST(request: Request) {
  return handle(async () => {
    const { distributor_id, product_ids } = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    return Response.json(
      await sendReorder(db, shop, { distributorId: distributor_id, productIds: product_ids }),
    );
  });
}
