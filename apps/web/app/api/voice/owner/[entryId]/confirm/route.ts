import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError, readJson } from "@/lib/http";
import { decideEntry } from "@/lib/owner-voice/entries";

const body = z.object({ customer_id: z.uuid().optional(), product_id: z.uuid().optional() });

/** The owner's yes to a card, with the customer or product he tapped if the card asked. */
export function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  return handle(async () => {
    const { entryId } = await context.params;
    if (!z.uuid().safeParse(entryId).success) throw new HttpError(404, "No such entry.");
    const picks = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    return Response.json(
      await decideEntry(db, shop.id, entryId, {
        confirm: true,
        customerId: picks.customer_id,
        productId: picks.product_id,
      }),
    );
  });
}
