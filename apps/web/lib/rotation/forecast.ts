import type { SourceLabel } from "@/lib/rotation/labels";
import { lateTotal, likelyFromCustomers, type CustomerPosition } from "@/lib/rotation/credit";
import { addDays, daysBetween, shopDate } from "@/lib/time";

// This week (spec 9.7): the money the next 7 days need against the money they are likely to
// bring, from bills, the owner's own numbers, verified payments and each customer's habit.

/** Under this share of what the week needs, a positive gap is "close", not "ok". */
export const CLOSE_SHARE = 0.1;
export const FORECAST_DAYS = 7;
/** Money in hand said longer ago than this is too old to plan with. */
export const MONEY_IN_HAND_MAX_DAYS = 2;
export const SALES_WINDOW_DAYS = 28;
/** Fewer days with a cash entry than this, and there is not enough to know a usual week. */
export const MIN_SALES_DAYS = 7;
const WEEKS_IN_YEAR = 52;
const MONTHS_IN_YEAR = 12;

export type Payable = {
  id: string;
  amountPaise: number;
  dueDate: string;
  paid: boolean;
  distributor: string;
  billNumber: string | null;
  purchaseOrderId: string | null;
};

export type Cost = { kind: string; amountPaise: number; period: "week" | "month" };

export type DayClose = {
  businessDate: string;
  cashSalesPaise: number | null;
  moneyInHandPaise: number | null;
  recordedAt: string;
};

export type Payment = { paidAt: string; amountPaise: number; isCreditRepayment: boolean };

export type ForecastState = "short" | "close" | "ok";

/** Unpaid bills due by the end of the week, overdue ones included (spec 9.7, change 4). */
export function dueThisWeek(
  payables: Payable[],
  today: string,
  leaveOut: ReadonlySet<string> = new Set(),
) {
  const end = addDays(today, FORECAST_DAYS);
  const due = payables.filter((p) => !p.paid && p.dueDate <= end && !leaveOut.has(p.id));
  const sum = (list: Payable[]) => list.reduce((total, p) => total + p.amountPaise, 0);
  return {
    paise: sum(due),
    overduePaise: sum(due.filter((p) => p.dueDate < today)),
    bills: due.length,
    label: "supplier_bill" as SourceLabel,
  };
}

/** The setup's costs as one week: a monthly cost is spread over the year's weeks. */
export function weeklyCosts(costs: Cost[]) {
  const paise = costs.reduce(
    (total, cost) =>
      total +
      (cost.period === "week"
        ? cost.amountPaise
        : Math.round((cost.amountPaise * MONTHS_IN_YEAR) / WEEKS_IN_YEAR)),
    0,
  );
  return { paise, label: "owner_said" as SourceLabel };
}

/**
 * The money in hand the owner said in the last 2 days plus verified payments since. Older than
 * that, it is left out and the screen asks for tonight's figure.
 */
export function moneyNow(dayCloses: DayClose[], payments: Payment[], now: Date) {
  const fresh = dayCloses
    .filter((d) => d.moneyInHandPaise !== null)
    .filter((d) => now.getTime() - Date.parse(d.recordedAt) <= MONEY_IN_HAND_MAX_DAYS * 86_400_000)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
  if (!fresh) {
    return {
      paise: 0,
      label: "owner_said" as SourceLabel,
      saidAt: null,
      verifiedAfterPaise: 0,
      missing: true,
    };
  }
  const verifiedAfterPaise = payments
    .filter((p) => p.paidAt > fresh.recordedAt)
    .reduce((total, p) => total + p.amountPaise, 0);
  return {
    paise: (fresh.moneyInHandPaise ?? 0) + verifiedAfterPaise,
    label: "owner_said" as SourceLabel,
    saidAt: fresh.recordedAt,
    verifiedAfterPaise,
    missing: false,
  };
}

/**
 * A usual week's sales: the average day, times 7. A day is the cash the owner said plus verified
 * payments that were sales, not repayments; only days with a cash entry in the last 28 count.
 */
export function usualWeekSales(dayCloses: DayClose[], payments: Payment[], today: string) {
  const from = addDays(today, -(SALES_WINDOW_DAYS - 1));
  const days = dayCloses.filter(
    (d) => d.cashSalesPaise !== null && d.businessDate >= from && d.businessDate <= today,
  );
  const digital = new Map<string, number>();
  for (const payment of payments.filter((p) => !p.isCreditRepayment)) {
    const date = shopDate(payment.paidAt);
    digital.set(date, (digital.get(date) ?? 0) + payment.amountPaise);
  }
  if (days.length < MIN_SALES_DAYS) {
    return {
      paise: 0,
      dailyPaise: 0,
      daysUsed: days.length,
      enough: false,
      label: "owner_said" as SourceLabel,
    };
  }
  const total = days.reduce(
    (sum, d) => sum + (d.cashSalesPaise ?? 0) + (digital.get(d.businessDate) ?? 0),
    0,
  );
  const dailyPaise = Math.round(total / days.length);
  return {
    paise: dailyPaise * FORECAST_DAYS,
    dailyPaise,
    daysUsed: days.length,
    enough: true,
    label: "owner_said" as SourceLabel,
  };
}

export function stateOf(gapPaise: number, neededPaise: number): ForecastState {
  if (gapPaise < 0) return "short";
  if (gapPaise < neededPaise * CLOSE_SHARE) return "close";
  return "ok";
}

export type ForecastInput = {
  payables: Payable[];
  costs: Cost[];
  dayCloses: DayClose[];
  payments: Payment[];
  positions: CustomerPosition[];
  now: Date;
  /** Bills to leave out, such as the festival order's for the loan-ready check (9.14). */
  leaveOut?: ReadonlySet<string>;
};

/** The week ahead, each part with where it came from. */
export function weekForecast(input: ForecastInput) {
  const today = shopDate(input.now);
  const due = dueThisWeek(input.payables, today, input.leaveOut);
  const costs = weeklyCosts(input.costs);
  const now = moneyNow(input.dayCloses, input.payments, input.now);
  const sales = usualWeekSales(input.dayCloses, input.payments, today);
  const customers = likelyFromCustomers(input.positions);
  const neededPaise = due.paise + costs.paise;
  const likelyPaise = now.paise + sales.paise + customers.paise;
  const gapPaise = likelyPaise - neededPaise;
  const asks = [
    ...(now.missing ? ["money_in_hand" as const] : []),
    ...(sales.enough ? [] : ["cash_sales" as const]),
  ];
  return {
    from: today,
    to: addDays(today, FORECAST_DAYS),
    needed: { paise: neededPaise, due, costs },
    likely: { paise: likelyPaise, now, sales, customers },
    gapPaise,
    state: stateOf(gapPaise, neededPaise),
    late: lateTotal(input.positions),
    asks,
  };
}

export type WeekForecast = ReturnType<typeof weekForecast>;

/** Days a bill is overdue, for the screen: 0 when it is not. */
export function overdueDays(dueDate: string, today: string): number {
  return Math.max(0, daysBetween(dueDate, today));
}
