import { handle } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";
import { deliverOrder } from "@/lib/owner/decide";

export function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    await deliverOrder(db, shop.id, (await context.params).id);
    return Response.json({ ok: true });
  });
}
