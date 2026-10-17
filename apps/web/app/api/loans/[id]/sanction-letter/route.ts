import { z } from "zod";
import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";
import { readSanctionLetter } from "@/lib/loans/read-sanction";

// The phone shrinks the photo to 1600 px before sending, which is well under this.
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/** A photo of the sanction letter in; its amount, EMI and months out, for the owner to check. */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new HttpError(404, "No such loan.");
    const { db, shop } = await requireShop(request);
    const photo = (await request.formData()).get("photo");
    if (!(photo instanceof Blob) || !photo.type.startsWith("image/")) {
      throw new HttpError(400, "Send a photo of the sanction letter.");
    }
    if (photo.size > MAX_PHOTO_BYTES) throw new HttpError(413, "That photo is too large.");
    return Response.json(await readSanctionLetter(db, shop, id, photo));
  });
}
