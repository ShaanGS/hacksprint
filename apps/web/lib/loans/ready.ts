import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { loadProfile } from "@/lib/loans/profile";
import { loadFestivalOrder } from "@/lib/rotation/festival";
import { loadShopData } from "@/lib/rotation/load";
import { loanNeeded } from "@/lib/rotation/loan";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { mudraBand, registrationStep } from "@/lib/schemes/band";
import { CHECKED_ON, fixedLines, loanForms, mudra, type LoanPurpose } from "@/lib/schemes/catalog";
import type { Shop } from "@/lib/shop";

// The loan-ready check (D3, spec 9.14 and section 10): does the festival order need a loan once
// spare money and late payers are counted, how much, and which official scheme covers it. When
// collecting is enough, it says so plainly.

export async function loanReady(
  db: SupabaseClient,
  shop: Shop,
  input: { purpose: LoanPurpose; amountPaise?: number },
) {
  const data = await loadShopData(db, shop.id);
  const order =
    input.amountPaise === undefined ? await loadFestivalOrder(db, shop.id, data.receipts) : null;
  if (input.amountPaise === undefined && !order) {
    throw new HttpError(409, "There is no approved festival order; say the amount you need.");
  }
  const needPaise = input.amountPaise ?? order?.totalPaise ?? 0;
  const without = snapshotOf(data, new Set(order?.payableId ? [order.payableId] : []));
  const gapWithoutOrderPaise = without.week.gapPaise;
  const canCollectPaise = without.week.late.paise;
  const loanNeededPaise = loanNeeded(needPaise, gapWithoutOrderPaise, canCollectPaise);
  const profile = await loadProfile(db, shop.id);
  const band = loanNeededPaise > 0 ? mudraBand(loanNeededPaise, profile.repaidTarunBefore) : null;

  const { data: saved, error } = await db
    .from("loan_requests")
    .insert({
      shop_id: shop.id,
      need_paise: needPaise,
      gap_without_order_paise: gapWithoutOrderPaise,
      can_collect_paise: canCollectPaise,
      loan_needed_paise: loanNeededPaise,
      purpose: input.purpose,
      source: order ? "festival_order" : "owner_said",
      purchase_order_id: order?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not save the loan check: ${error.message}`);
  const loanRequestId = z.object({ id: z.string() }).parse(saved).id;
  await audit(db, shop.id, [
    {
      actor: "owner",
      action: "loan.ready",
      entityType: "loan_request",
      entityId: loanRequestId,
      payload: { loanNeededPaise },
    },
  ]);

  const form = loanForms[input.purpose];
  return {
    loan_request_id: loanRequestId,
    need: {
      paise: needPaise,
      label: order ? "supplier_bill" : "owner_said",
      source: order ? "festival_order" : "owner_said",
      order: order
        ? {
            festival: order.festival,
            distributor: order.distributor,
            bill_number: order.billNumber,
          }
        : null,
    },
    gap_without_order_paise: gapWithoutOrderPaise,
    can_collect_paise: canCollectPaise,
    late_customers: without.week.late.customers,
    loan_needed_paise: loanNeededPaise,
    no_loan_needed: loanNeededPaise === 0,
    scheme:
      band === null
        ? null
        : band.covered
          ? {
              name: mudra.name,
              band: band.band.key,
              band_name: band.band.name,
              range: band.band.range,
              no_collateral: mudra.noCollateral,
              apply_at: mudra.applyAt,
              links: mudra.links,
            }
          : { name: mudra.name, band: null, not_covered: band.reason, links: mudra.links },
    loan_form: { purpose: input.purpose, line: form.line, why: form.why, links: form.links },
    registration: registrationStep(profile),
    checked_on: CHECKED_ON,
    fixed_lines: fixedLines,
  };
}
