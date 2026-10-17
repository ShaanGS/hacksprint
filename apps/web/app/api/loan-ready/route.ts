import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, readJson } from "@/lib/http";
import { loanReady } from "@/lib/loans/ready";

const body = z.object({
  purpose: z.enum(["stock_rotation", "equipment"]),
  amount_paise: z.number().int().positive().max(2_000_000_000).optional(),
});

/** D3: from the week and the festival order, does he need a loan, how much, and which scheme. */
export function POST(request: Request) {
  return handle(async () => {
    const input = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    return Response.json(
      await loanReady(db, shop, { purpose: input.purpose, amountPaise: input.amount_paise }),
    );
  });
}
