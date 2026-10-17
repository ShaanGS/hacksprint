import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, readJson } from "@/lib/http";
import { costKinds, costsResponse, loadCosts, saveCosts } from "@/lib/setup";

const body = z.object({
  costs: z
    .array(
      z.object({
        kind: z.enum(costKinds),
        amount_paise: z.number().int().min(0).max(100_000_000),
        period: z.enum(["week", "month"]),
      }),
    )
    .max(20),
});

/** The shop's weekly costs (B7), as the owner said them. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(costsResponse(await loadCosts(db, shop.id)));
  });
}

export function PUT(request: Request) {
  return handle(async () => {
    const input = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    const costs = input.costs.map((c) => ({
      kind: c.kind,
      amountPaise: c.amount_paise,
      period: c.period,
    }));
    await saveCosts(db, shop.id, costs);
    return Response.json(costsResponse(costs));
  });
}
