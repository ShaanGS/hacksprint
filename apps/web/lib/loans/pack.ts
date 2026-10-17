import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { appEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { loadProfile } from "@/lib/loans/profile";
import { loadFestivalOrder, type FestivalOrder } from "@/lib/rotation/festival";
import { loadShopData } from "@/lib/rotation/load";
import { mudraBand, registrationStep, type ShopProfile } from "@/lib/schemes/band";
import { saveStatement, statementPayload } from "@/lib/statement/build";
import type { Shop } from "@/lib/shop";

// The loan pack (D4): the statement, the stock quotation, the documents the bank asks for and
// where to apply. He takes it to the bank himself; we send it to no lender (spec rule 8).

export type ChecklistItem = {
  key:
    | "aadhaar"
    | "pan"
    | "udyam"
    | "business_proof"
    | "address_proof"
    | "photos"
    | "quotation"
    | "bank_statements";
  status: "have" | "missing" | "bring";
};

/**
 * Have or missing where we know; "bring" where we never ask (spec rule 10). The quotation is
 * missing when the loan is for an amount he said rather than a festival order.
 */
export function checklist(profile: ShopProfile, hasQuotation: boolean): ChecklistItem[] {
  return [
    { key: "aadhaar", status: "bring" },
    { key: "pan", status: profile.hasPan ? "have" : "missing" },
    { key: "udyam", status: profile.udyamStatus === "yes" ? "have" : "missing" },
    { key: "business_proof", status: "bring" },
    { key: "address_proof", status: "bring" },
    { key: "photos", status: "bring" },
    { key: "quotation", status: hasQuotation ? "have" : "missing" },
    { key: "bank_statements", status: "bring" },
  ];
}

const requestRow = z.object({
  id: z.string(),
  loan_needed_paise: z.number().int(),
  purchase_order_id: z.string().nullable(),
});

/** The stock quotation (D4): the festival order at its bill prices, frozen with the pack. */
function quotationOf(order: FestivalOrder | null) {
  return (
    order && {
      festival: order.festival,
      distributor: order.distributor,
      bill_number: order.billNumber,
      lines: order.lines.map((line) => ({
        name: line.name,
        qty: line.qty,
        unit_cost_paise: line.unitCostPaise,
        line_paise: line.linePaise,
      })),
      total_paise: order.totalPaise,
    }
  );
}

export async function createLoanPack(db: SupabaseClient, shop: Shop, loanRequestId: string) {
  const { data, error } = await db
    .from("loan_requests")
    .select("id, loan_needed_paise, purchase_order_id")
    .eq("id", loanRequestId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the loan check: ${error.message}`);
  if (!data) throw new HttpError(404, "No such loan check.");
  const request = requestRow.parse(data);
  if (request.loan_needed_paise === 0)
    throw new HttpError(409, "No loan is needed; collect from the late payers.");

  const [profile, shopData] = await Promise.all([
    loadProfile(db, shop.id),
    loadShopData(db, shop.id),
  ]);
  const band = mudraBand(request.loan_needed_paise, profile.repaidTarunBefore);
  const order = request.purchase_order_id
    ? await loadFestivalOrder(db, shop.id, shopData.receipts, request.purchase_order_id)
    : null;
  const statement = await saveStatement(db, shop.id, statementPayload(shop, shopData));
  const shareToken = randomBytes(12).toString("base64url");
  const saved = await db
    .from("loan_packs")
    .insert({
      shop_id: shop.id,
      loan_request_id: request.id,
      scheme_band: band.covered ? band.band.key : band.reason,
      checklist: {
        items: checklist(profile, order !== null),
        registration: registrationStep(profile),
        quotation: quotationOf(order),
      },
      statement_id: statement.id,
      share_token: shareToken,
    })
    .select("id")
    .single();
  if (saved.error) throw new Error(`Could not save the loan pack: ${saved.error.message}`);
  const id = z.object({ id: z.string() }).parse(saved.data).id;
  await audit(db, shop.id, [
    { actor: "owner", action: "loan.pack", entityType: "loan_pack", entityId: id },
  ]);
  return { loan_pack_id: id, share_url: `${appEnv().APP_URL}/loan-pack/${shareToken}` };
}
