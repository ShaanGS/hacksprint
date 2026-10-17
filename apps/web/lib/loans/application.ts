import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { checklist } from "@/lib/loans/pack";
import { loadProfile } from "@/lib/loans/profile";
import { loadShopData } from "@/lib/rotation/load";
import { mudraBand, registrationStep } from "@/lib/schemes/band";
import type { Shop } from "@/lib/shop";
import { statementPayload } from "@/lib/statement/build";

// The apply agent (demo only, decided Oct 17): the loan application as it would read, filled
// from the shop's own records and shown step by step. It is a simulation and sends nothing; a
// real one would make us a lending service provider and needs his own Aadhaar OTP (spec rule 8).

const requestRow = z.object({
  id: z.string(),
  loan_needed_paise: z.number().int(),
  purpose: z.enum(["stock_rotation", "equipment"]),
  purchase_order_id: z.string().nullable(),
});

// A month's average, to the rupee: an application states sales in rupees.
const average = (values: number[]) =>
  values.length === 0
    ? 0
    : Math.round(values.reduce((sum, v) => sum + v, 0) / values.length / 100) * 100;

export async function applicationDraft(db: SupabaseClient, shop: Shop, loanRequestId: string) {
  const { data, error } = await db
    .from("loan_requests")
    .select("id, loan_needed_paise, purpose, purchase_order_id")
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
  const { blocks } = statementPayload(shop, shopData);
  const band = mudraBand(request.loan_needed_paise, profile.repaidTarunBefore);
  await audit(db, shop.id, [
    {
      actor: "agent",
      action: "loan.apply_simulated",
      entityType: "loan_request",
      entityId: request.id,
    },
  ]);
  return {
    simulated: true,
    shop: shop.name,
    owner: shop.ownerName,
    loan_paise: request.loan_needed_paise,
    purpose: request.purpose,
    band: band.covered ? band.band.key : null,
    months: blocks.months.length,
    monthly_sales: {
      verified_paise: average(blocks.verified.digitalPayments.byMonth),
      declared_paise: average(blocks.declared.cashSales.byMonth),
    },
    bills_paid_on_time: blocks.declared.billsPaidOnTime.percent,
    documents: checklist(profile, request.purchase_order_id !== null),
    registration: registrationStep(profile),
  };
}
