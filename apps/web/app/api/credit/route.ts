import { z } from "zod";
import { addSpokenCredit, creditBook } from "@/lib/credit/book";
import { handle, readJson } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";

const body = z.object({
  customer_id: z.uuid(),
  amount_paise: z.number().int().positive().max(10_000_000),
  heard: z.string().max(500),
});

/** The credit book (spec D1): who owes the shop and how much. */
export function GET() {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    return Response.json(await creditBook(db, shop.id), {
      headers: { "Cache-Control": "no-store" },
    });
  });
}

/** The owner confirms a spoken entry; only then is it written. */
export function POST(request: Request) {
  return handle(async () => {
    const input = await readJson(request, body);
    const { db, shop } = await requireOwner();
    await addSpokenCredit(db, shop.id, {
      customerId: input.customer_id,
      amountPaise: input.amount_paise,
      heard: input.heard,
    });
    return Response.json({ ok: true });
  });
}
