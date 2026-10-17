import { requireCustomer } from "@/lib/customer/context";
import { handle, HttpError } from "@/lib/http";
import { langInfo } from "@/lib/i18n/languages";
import { forSpeech } from "@/lib/i18n/speech";
import { textToSpeech } from "@/lib/sarvam/client";
import { findCustomerTurn } from "@/lib/voice/turns";

/** The shop's reply, spoken. Only the customer whose order it is can hear it. */
export function GET(_request: Request, context: { params: Promise<{ turnId: string }> }) {
  return handle(async () => {
    const turnId = Number((await context.params).turnId);
    if (!Number.isInteger(turnId)) throw new HttpError(400, "No such reply.");
    const { db, customer } = await requireCustomer();
    const turn = await findCustomerTurn(db, customer.id, turnId);
    if (!turn || turn.role !== "shop") throw new HttpError(404, "No such reply.");
    const voice = langInfo[turn.lang];
    const audio = await textToSpeech(
      forSpeech(turn.text, turn.lang),
      voice.sarvamCode,
      voice.voice,
    );
    return new Response(new Uint8Array(audio), {
      headers: {
        "Content-Type": "audio/mpeg",
        // A reply never changes, so a replay comes from the phone's cache, not Sarvam.
        "Cache-Control": "private, max-age=86400, immutable",
      },
    });
  });
}
