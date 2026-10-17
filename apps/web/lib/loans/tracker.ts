import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { canMove, emiDueDates, loanStatuses, nextSteps, setAsideTonight } from "@/lib/loans/track";
import type { LoanStatus } from "@/lib/loans/track";
import { broadcastChanged } from "@/lib/realtime";
import { overdueDays, usualWeekSales } from "@/lib/rotation/forecast";
import { loadShopData, type ShopData } from "@/lib/rotation/load";
import type { Shop } from "@/lib/shop";
import { shopDate } from "@/lib/time";

// The loan tracker (Oct 17): the owner taps each step the bank takes after the loan check, and
// once the loan is paid out its EMIs become dues the week counts (9.16). We never hold or move
// the money; every amount is his word (owner_said).

const status = z.enum(loanStatuses);
const loanRow = z.object({
  id: z.string(),
  status,
  sanctioned_paise: z.number().int().nullable(),
  emi_paise: z.number().int().nullable(),
  tenure_months: z.number().int().nullable(),
  disbursed_on: z.string().nullable(),
  loan_requests: z.object({
    loan_needed_paise: z.number().int(),
    purpose: z.enum(["stock_rotation", "equipment"]),
  }),
  loan_steps: z.array(z.object({ status, at: z.string() })),
});
const emiRow = z.object({
  id: z.string(),
  amount_paise: z.number().int(),
  due_date: z.string(),
  paid_at: z.string().nullable(),
  emi_set_asides: z.array(z.object({ amount_paise: z.number().int() })),
});

const LOAN_COLUMNS =
  "id, status, sanctioned_paise, emi_paise, tenure_months, disbursed_on, loan_requests(loan_needed_paise, purpose), loan_steps(status, at)";

/** Today's sales so far: verified sales plus the cash he said tonight; null before he says it. */
function todaySales(data: ShopData): number | null {
  const close = data.dayCloses.find((d) => d.businessDate === data.today);
  if (!close || close.cashSalesPaise === null) return null;
  const digital = data.payments
    .filter((p) => !p.isCreditRepayment && shopDate(p.paidAt) === data.today)
    .reduce((sum, p) => sum + p.amountPaise, 0);
  return close.cashSalesPaise + digital;
}

async function emiPlan(db: SupabaseClient, shopId: string, loanId: string, now: Date) {
  const { data, error } = await db
    .from("payables")
    .select("id, amount_paise, due_date, paid_at, emi_set_asides(amount_paise)")
    .eq("loan_id", loanId)
    .order("due_date");
  if (error) throw new Error(`Could not read the EMIs: ${error.message}`);
  const emis = z.array(emiRow).parse(data);
  const due = emis.find((e) => e.paid_at === null);
  const counts = {
    paid: emis.length - emis.filter((e) => e.paid_at === null).length,
    total: emis.length,
  };
  if (!due) return { emis: counts, next_emi: null };

  const shop = await loadShopData(db, shopId, now);
  const keptPaise = due.emi_set_asides.reduce((sum, s) => sum + s.amount_paise, 0);
  const plan = setAsideTonight({
    emiPaise: due.amount_paise,
    keptPaise,
    dueDate: due.due_date,
    today: shop.today,
    todaySalesPaise: todaySales(shop),
    usualDayPaise: usualWeekSales(shop.dayCloses, shop.payments, shop.today).dailyPaise,
  });
  return {
    emis: counts,
    next_emi: {
      payable_id: due.id,
      amount_paise: due.amount_paise,
      due_date: due.due_date,
      overdue_days: overdueDays(due.due_date, shop.today),
      kept_paise: keptPaise,
      remaining_paise: plan.remainingPaise,
      tonight_paise: plan.tonightPaise,
      days_left: plan.daysLeft,
      started: plan.started,
      label: "owner_said" as const,
    },
  };
}

/** The shop's latest tracked loan with its steps, and the next EMI once it is paid out. */
export async function loanTracker(db: SupabaseClient, shop: Shop, now = new Date()) {
  const { data, error } = await db
    .from("loans")
    .select(LOAN_COLUMNS)
    .eq("shop_id", shop.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not read the loan: ${error.message}`);
  if (!data) return { loan: null };
  const loan = loanRow.parse(data);
  const plan =
    loan.status === "disbursed"
      ? await emiPlan(db, shop.id, loan.id, now)
      : { emis: null, next_emi: null };
  return {
    loan: {
      id: loan.id,
      status: loan.status,
      loan_needed_paise: loan.loan_requests.loan_needed_paise,
      purpose: loan.loan_requests.purpose,
      sanctioned_paise: loan.sanctioned_paise,
      emi_paise: loan.emi_paise,
      tenure_months: loan.tenure_months,
      disbursed_on: loan.disbursed_on,
      steps: [...loan.loan_steps].sort((a, b) => a.at.localeCompare(b.at)),
      next_steps: nextSteps(loan.status),
      ...plan,
    },
  };
}

async function recordStep(db: SupabaseClient, shopId: string, loanId: string, to: LoanStatus) {
  const step = await db.from("loan_steps").insert({ loan_id: loanId, status: to });
  if (step.error) throw new Error(`Could not save the loan step: ${step.error.message}`);
  await audit(db, shopId, [
    { actor: "owner", action: `loan.${to}`, entityType: "loan", entityId: loanId },
  ]);
  await broadcastChanged(db, shopId, ["rotation"]);
}

/** He tells us he applied at the bank for the loan a check sized; tracking starts there. */
export async function startLoan(db: SupabaseClient, shop: Shop, loanRequestId: string) {
  const request = await db
    .from("loan_requests")
    .select("loan_needed_paise")
    .eq("id", loanRequestId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (request.error) throw new Error(`Could not read the loan check: ${request.error.message}`);
  if (!request.data) throw new HttpError(404, "No such loan check.");
  if (z.object({ loan_needed_paise: z.number() }).parse(request.data).loan_needed_paise === 0)
    throw new HttpError(409, "No loan is needed; collect from the late payers.");
  const saved = await db
    .from("loans")
    .insert({ shop_id: shop.id, loan_request_id: loanRequestId })
    .select("id")
    .single();
  if (saved.error?.code === "23505") throw new HttpError(409, "This loan is already tracked.");
  if (saved.error) throw new Error(`Could not save the loan: ${saved.error.message}`);
  const loanId = z.object({ id: z.string() }).parse(saved.data).id;
  await recordStep(db, shop.id, loanId, "applied");
  return { loan_id: loanId };
}

export type Sanction = { sanctionedPaise: number; emiPaise: number; tenureMonths: number };

/** The next step he taps. Sanctioned needs what the bank told him; disbursed writes the EMIs. */
export async function moveLoan(
  db: SupabaseClient,
  shop: Shop,
  loanId: string,
  to: LoanStatus,
  sanction: Sanction | null,
  now = new Date(),
) {
  const { data, error } = await db
    .from("loans")
    .select("status, emi_paise, tenure_months")
    .eq("id", loanId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the loan: ${error.message}`);
  if (!data) throw new HttpError(404, "No such loan.");
  const loan = z
    .object({ status, emi_paise: z.number().nullable(), tenure_months: z.number().nullable() })
    .parse(data);
  if (!canMove(loan.status, to)) throw new HttpError(409, "That step does not come next.");
  if (to === "sanctioned" && !sanction)
    throw new HttpError(400, "Say the amount, the EMI and the months the bank gave.");

  const today = shopDate(now);
  const update = {
    status: to,
    updated_at: now.toISOString(),
    ...(sanction && to === "sanctioned"
      ? {
          sanctioned_paise: sanction.sanctionedPaise,
          emi_paise: sanction.emiPaise,
          tenure_months: sanction.tenureMonths,
        }
      : {}),
    ...(to === "disbursed" ? { disbursed_on: today } : {}),
  };
  // Only from the status we read, so two taps cannot write the EMIs twice.
  const moved = await db
    .from("loans")
    .update(update)
    .eq("id", loanId)
    .eq("status", loan.status)
    .select("id")
    .maybeSingle();
  if (moved.error) throw new Error(`Could not move the loan: ${moved.error.message}`);
  if (!moved.data) throw new HttpError(409, "The loan changed; look again.");

  if (to === "disbursed" && loan.emi_paise !== null && loan.tenure_months !== null) {
    const emiPaise = loan.emi_paise;
    const rows = emiDueDates(today, loan.tenure_months).map((dueDate) => ({
      shop_id: shop.id,
      loan_id: loanId,
      kind: "loan_emi",
      amount_paise: emiPaise,
      due_date: dueDate,
    }));
    const emis = await db.from("payables").insert(rows);
    if (emis.error) throw new Error(`Could not save the EMIs: ${emis.error.message}`);
  }
  await recordStep(db, shop.id, loanId, to);
}

/** He kept some money aside tonight for the next EMI, in his own account (owner_said). */
export async function keepAside(
  db: SupabaseClient,
  shop: Shop,
  payableId: string,
  amountPaise: number,
  now = new Date(),
) {
  const { data, error } = await db
    .from("payables")
    .select("id")
    .eq("id", payableId)
    .eq("shop_id", shop.id)
    .eq("kind", "loan_emi")
    .is("paid_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read the EMI: ${error.message}`);
  if (!data) throw new HttpError(409, "This EMI is already paid, or does not exist.");
  const saved = await db.from("emi_set_asides").insert({
    shop_id: shop.id,
    payable_id: payableId,
    amount_paise: amountPaise,
    kept_on: shopDate(now),
  });
  if (saved.error) throw new Error(`Could not save what you kept: ${saved.error.message}`);
  await audit(db, shop.id, [
    {
      actor: "owner",
      action: "loan.set_aside",
      entityType: "payable",
      entityId: payableId,
      payload: { amountPaise },
    },
  ]);
  await broadcastChanged(db, shop.id, ["rotation"]);
}

export type LoanTracker = Awaited<ReturnType<typeof loanTracker>>;
