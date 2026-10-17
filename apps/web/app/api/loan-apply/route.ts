import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { demoMode } from "@/lib/env";
import { handle, HttpError, readJson } from "@/lib/http";
import { applicationDraft } from "@/lib/loans/application";

const body = z.object({ loan_request_id: z.uuid() });

/**
 * The apply agent, while the shop runs on demo data: the loan application filled from his
 * records. A simulation; nothing is sent to any portal or lender.
 */
export function POST(request: Request) {
  return handle(async () => {
    if (!demoMode()) throw new HttpError(404, "Not found.");
    const { loan_request_id } = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    return Response.json(await applicationDraft(db, shop, loan_request_id));
  });
}
