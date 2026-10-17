import { handle, HttpError } from "@/lib/http";
import { langInfo } from "@/lib/i18n/languages";
import { forSpeech } from "@/lib/i18n/speech";
import { announcement } from "@/lib/owner/announce";
import { requireOwner } from "@/lib/owner/context";
import { ownerOrders } from "@/lib/owner/orders";
import { textToSpeech } from "@/lib/sarvam/client";
import { startOfShopDay } from "@/lib/time";

/** The new order, spoken in the owner's language on the owner's phone (spec A2, A6). */
export function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = (await context.params).id;
    const { db, shop } = await requireOwner();
    const order = (await ownerOrders(db, shop.id, startOfShopDay())).find((o) => o.id === id);
    if (!order) throw new HttpError(404, "No such order.");
    const voice = langInfo[shop.ownerLang];
    const text = forSpeech(announcement(order, shop.ownerLang), shop.ownerLang);
    const audio = await textToSpeech(text, voice.sarvamCode, voice.voice);
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600" },
    });
  });
}
