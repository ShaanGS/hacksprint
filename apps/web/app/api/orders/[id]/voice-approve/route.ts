import { audit } from "@/lib/audit";
import { handle, HttpError } from "@/lib/http";
import { langInfo } from "@/lib/i18n/languages";
import { parseApproval } from "@/lib/owner/approval";
import { requireOwner } from "@/lib/owner/context";
import { approveOrder, rejectOrder } from "@/lib/owner/decide";
import { speechToText } from "@/lib/sarvam/client";

/**
 * The owner's spoken decision (spec A6): "seri" approves, "venda" rejects, "kanakku" puts it on
 * account. Nothing happens unless one of those words was heard; the owner then sees what was heard
 * and what was done.
 */
export function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const id = (await context.params).id;
    const { db, shop } = await requireOwner();
    const audio = (await request.formData()).get("audio");
    if (!(audio instanceof Blob) || audio.size === 0)
      throw new HttpError(400, "Send the recording.");
    const heard = await speechToText(
      audio,
      audio.type.includes("mp4") ? "owner.mp4" : "owner.webm",
      {
        languageCode: langInfo[shop.ownerLang].sarvamCode,
      },
    );
    const decision = parseApproval(heard.transcript);
    await audit(db, shop.id, [
      {
        actor: "owner",
        action: "order.voice_decision",
        entityType: "order",
        entityId: id,
        payload: { heard: heard.transcript, decision },
      },
    ]);
    if (decision === "reject") {
      await rejectOrder(db, shop.id, id, "other");
      return Response.json({ heard: heard.transcript, decision, payUrl: null });
    }
    if (decision) {
      const approval = await approveOrder(
        db,
        shop,
        id,
        decision === "credit" ? "credit" : undefined,
      );
      return Response.json({ heard: heard.transcript, decision, payUrl: approval.payUrl });
    }
    return Response.json({ heard: heard.transcript, decision: null, payUrl: null });
  });
}
