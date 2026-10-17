import { shopCustomers } from "@/lib/credit/book";
import { draftSpokenCredit } from "@/lib/credit/parse";
import { handle, HttpError } from "@/lib/http";
import { langInfo } from "@/lib/i18n/languages";
import { requireOwner } from "@/lib/owner/context";
import { speechToText } from "@/lib/sarvam/client";

/**
 * "Ramesh 200 on account" (spec D1): the owner's words in, an entry out for the owner to check.
 * Customer names go to the speech engine as key terms, so they come back as they are written.
 */
export function POST(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    const audio = (await request.formData()).get("audio");
    if (!(audio instanceof Blob) || audio.size === 0)
      throw new HttpError(400, "Send the recording.");
    const customers = await shopCustomers(db, shop.id);
    const heard = await speechToText(
      audio,
      audio.type.includes("mp4") ? "credit.mp4" : "credit.webm",
      {
        languageCode: langInfo[shop.ownerLang].sarvamCode,
        keyterms: customers.map((customer) => customer.name),
      },
    );
    return Response.json(draftSpokenCredit(heard.transcript, customers));
  });
}
