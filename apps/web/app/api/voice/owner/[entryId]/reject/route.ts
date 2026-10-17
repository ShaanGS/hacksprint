import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";
import { decideEntry } from "@/lib/owner-voice/entries";

/** The owner's no: nothing is written. */
export function POST(request: Request, context: { params: Promise<{ entryId: string }> }) {
  return handle(async () => {
    const { entryId } = await context.params;
    if (!z.uuid().safeParse(entryId).success) throw new HttpError(404, "No such entry.");
    const { db, shop } = await requireShop(request);
    return Response.json(await decideEntry(db, shop.id, entryId, { confirm: false }));
  });
}
