import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, readJson } from "@/lib/http";
import { createLoanPack } from "@/lib/loans/pack";

const body = z.object({ loan_request_id: z.uuid() });

/** D4: the printable pack for the bank, from a loan-ready check that found a loan is needed. */
export function POST(request: Request) {
  return handle(async () => {
    const { loan_request_id } = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    return Response.json(await createLoanPack(db, shop, loan_request_id));
  });
}
