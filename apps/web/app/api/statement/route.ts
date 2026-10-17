import { requireShop } from "@/lib/auth/shop";
import { handle, HttpError } from "@/lib/http";
import { loadShopData } from "@/lib/rotation/load";
import { saveStatement, statementJson, statementPayload } from "@/lib/statement/build";

/** D1: the last 3 full months, verified and declared, frozen with a share link. */
export function GET(request: Request) {
  return handle(async () => {
    const months = new URL(request.url).searchParams.get("months") ?? "3";
    if (months !== "3") throw new HttpError(400, "Statements cover the last 3 full months.");
    const { db, shop } = await requireShop(request);
    const payload = statementPayload(shop, await loadShopData(db, shop.id));
    const saved = await saveStatement(db, shop.id, payload);
    return Response.json({
      statement_id: saved.id,
      share_url: saved.shareUrl,
      ...statementJson(payload),
    });
  });
}
