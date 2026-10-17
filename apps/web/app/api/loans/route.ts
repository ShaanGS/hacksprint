import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, readJson } from "@/lib/http";
import { loanTracker, startLoan } from "@/lib/loans/tracker";

const body = z.object({ loan_request_id: z.uuid() });

/** The loan tracker: the latest loan's steps, and the next EMI once it is paid out. */
export function GET(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    return Response.json(await loanTracker(db, shop));
  });
}

/** He applied at the bank for the loan a check sized; tracking starts. */
export function POST(request: Request) {
  return handle(async () => {
    const { loan_request_id } = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    return Response.json(await startLoan(db, shop, loan_request_id));
  });
}
