import { handle, HttpError } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";
import { retryLink } from "@/lib/owner/decide";

/** Retry, when the payment link could not be made at approval. */
export function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    const payUrl = await retryLink(db, shop, (await context.params).id);
    if (!payUrl) throw new HttpError(502, "The payment link could not be made. Try again.");
    return Response.json({ payUrl });
  });
}
