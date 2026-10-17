import { z } from "zod";
import { handle, readJson } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";
import { approveOrder } from "@/lib/owner/decide";

const body = z.object({ payment_mode: z.enum(["link", "credit"]).optional() });

/** The owner's approval (guardrail 3): on account, or with a payment link for the customer. */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { payment_mode } = await readJson(request, body);
    const { db, shop } = await requireOwner();
    return Response.json(await approveOrder(db, shop, (await context.params).id, payment_mode));
  });
}
