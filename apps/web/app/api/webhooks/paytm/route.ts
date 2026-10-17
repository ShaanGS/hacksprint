import { audit } from "@/lib/audit";
import { paytmEnv } from "@/lib/env";
import { handle, HttpError } from "@/lib/http";
import { markPaid } from "@/lib/payments";
import { verifyPaytm } from "@/lib/paytm/checksum";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

// Paytm's payment status callback for our links (spec A7, guardrail 5). It is trusted only if
// its checksum verifies with our merchant key, the merchant id is ours and the status is a
// success; then the same markPaid as the test page runs, which does nothing the second time.

/** Paytm signs the callback's values sorted by name and joined with "|", without the hash itself. */
export function callbackSignatureData(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => key !== "CHECKSUMHASH")
    .sort()
    .map((key) => (params[key] && params[key].toLowerCase() !== "null" ? params[key] : ""))
    .join("|");
}

async function readParams(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await request.json()) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(body).map(([key, value]) => [key, String(value ?? "")]),
    );
  }
  const form = await request.formData();
  return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
}

/**
 * The link this payment belongs to. Paytm's link webhook carries it in MERC_UNQ_REF, at times
 * with a prefix ("LI_123"); other callbacks have sent linkId, in either spelling.
 */
export function linkIdOf(params: Record<string, string>): string | undefined {
  const key = Object.keys(params).find((name) => name.toLowerCase() === "linkid");
  if (key && params[key]) return params[key];
  return params.MERC_UNQ_REF?.match(/(\d+)$/)?.[1];
}

export function POST(request: Request) {
  return handle(async () => {
    const env = paytmEnv();
    const params = await readParams(request);
    const db = createServiceClient();
    const shop = await getShop(db);
    // Every callback is kept, so the team can see exactly what Paytm sent.
    await audit(db, shop.id, [{ actor: "paytm", action: "payment.callback", payload: params }]);

    const signature = params.CHECKSUMHASH ?? "";
    if (!verifyPaytm(callbackSignatureData(params), env.PAYTM_MERCHANT_KEY, signature)) {
      throw new HttpError(401, "Bad checksum");
    }
    if (params.MID !== env.PAYTM_MID) throw new HttpError(401, "Wrong merchant");
    const linkId = linkIdOf(params);
    if (params.STATUS !== "TXN_SUCCESS" || !linkId || !params.TXNID) {
      return Response.json({ ok: true, paid: false });
    }
    const moved = await markPaid(db, { providerLinkId: linkId }, params.TXNID, "paytm");
    return Response.json({ ok: true, paid: true, alreadyPaid: !moved });
  });
}
