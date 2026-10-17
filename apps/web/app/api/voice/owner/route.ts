import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";
import { hearEntry } from "@/lib/owner-voice/entries";

/**
 * B1: the owner's recording in; what was heard and one entry out, as a card for his tap. Nothing
 * is written until he confirms it.
 */
export function POST(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    const audio = (await request.formData()).get("audio");
    if (!(audio instanceof Blob) || audio.size === 0)
      throw new HttpError(400, "Send the recording.");
    return Response.json(await hearEntry(db, shop, audio));
  });
}
