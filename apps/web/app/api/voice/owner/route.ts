import { requireShop } from "@/lib/auth/shop";
import { isLang } from "@/lib/i18n/languages";
import { handle, HttpError } from "@/lib/http";
import { hearEntry } from "@/lib/owner-voice/entries";

/**
 * B1: the owner's recording in; what was heard and one entry out, as a card for his tap, or the
 * answer to a question about his money. Nothing is written until he confirms an entry.
 */
export function POST(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireShop(request);
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0)
      throw new HttpError(400, "Send the recording.");
    // The language on the owner's screen, so a spoken question is answered in it.
    const lang = form.get("lang");
    return Response.json(await hearEntry(db, shop, audio, isLang(lang) ? lang : shop.ownerLang));
  });
}
