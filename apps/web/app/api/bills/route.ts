import { scanBill } from "@/lib/bills/scan";
import { handle, HttpError } from "@/lib/http";
import { requireOwner } from "@/lib/owner/context";

// The phone shrinks the photo to 1600 px before sending, which is well under this.
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;

/** A photo of today's bill in; its lines out, for the owner to check (spec B1). */
export function POST(request: Request) {
  return handle(async () => {
    const { db, shop } = await requireOwner();
    const photo = (await request.formData()).get("photo");
    if (!(photo instanceof Blob) || !photo.type.startsWith("image/")) {
      throw new HttpError(400, "Send a photo of the bill.");
    }
    if (photo.size > MAX_PHOTO_BYTES) throw new HttpError(413, "That photo is too large.");
    return Response.json(await scanBill(db, shop, photo));
  });
}
