import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError, readJson } from "@/lib/http";
import { markPayablePaid } from "@/lib/payables";

const body = z.object({ paid_via: z.enum(["cash", "bank", "upi"]) });

/** The owner says he paid a bill (his word, owner_said); the week updates. */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, "No such bill.");
    const { paid_via } = await readJson(request, body);
    const { db, shop } = await requireShop(request);
    await markPayablePaid(db, shop.id, id, paid_via);
    return Response.json({ ok: true });
  });
}
