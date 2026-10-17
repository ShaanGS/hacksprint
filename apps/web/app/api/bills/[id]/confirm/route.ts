import { z } from "zod";
import { confirmBill } from "@/lib/bills/confirm";
import { handle, HttpError, readJson } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";

const body = z.object({
  distributor_id: z.uuid(),
  lines: z
    .array(
      z.object({
        product_id: z.uuid(),
        qty: z.number().positive().max(10_000),
        unit_cost_paise: z.number().int().positive(),
        mrp_paise: z.number().int().positive().nullable(),
      }),
    )
    .min(1)
    .max(60),
});

/** The owner's yes: stock, prices, payable, delivery check and price alerts (spec B1, B4, C1). */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = (await context.params).id;
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, "No such bill.");
    const input = await readJson(request, body);
    const { db, shop } = await requireOwner();
    const outcome = await confirmBill(db, shop, id, {
      distributorId: input.distributor_id,
      lines: input.lines.map((line) => ({
        productId: line.product_id,
        qty: line.qty,
        unitCostPaise: line.unit_cost_paise,
        mrpPaise: line.mrp_paise,
      })),
    });
    return Response.json(outcome);
  });
}
