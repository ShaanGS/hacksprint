import { settle, type CustomerLedger } from "@/lib/rotation/credit";
import type { DayClose, Payment } from "@/lib/rotation/forecast";
import { weakest, type SourceLabel } from "@/lib/rotation/labels";
import { monthOf, shopDate } from "@/lib/time";

// The shop statement (spec 9.13): the last 3 full months, totals only, in two blocks that are never
// merged. Verified is what a payment provider or a supplier's bill shows; declared is what the
// owner said and what we estimate. Each metric takes the label of its weakest input.

export type StatementBill = { billedOn: string; totalPaise: number };
export type StatementPayable = {
  dueDate: string;
  paidAt: string | null;
  paidVia: string | null;
  amountPaise: number;
};

/** One row behind a statement number: a day and an amount, never a name (rule 7). */
export type StatementRow = { date: string; paise: number; late?: boolean };

export type StatementInput = {
  months: string[];
  payments: Payment[];
  dayCloses: DayClose[];
  customers: CustomerLedger[];
  bills: StatementBill[];
  payables: StatementPayable[];
  /** The shelf estimate at each month's end, at cost. */
  stockValueByMonth: number[];
  moneyCycleDays: number | null;
};

function byMonth<T>(
  months: string[],
  items: T[],
  monthOfItem: (item: T) => string,
  amount: (item: T) => number,
) {
  return months.map((month) =>
    items
      .filter((item) => monthOfItem(item) === month)
      .reduce((sum, item) => sum + amount(item), 0),
  );
}

/** The rows a monthly total is made of, oldest first, so they add up to its cells. */
function rowsOf<T>(
  months: string[],
  items: T[],
  dateOf: (item: T) => string,
  amount: (item: T) => number,
): StatementRow[] {
  return items
    .filter((item) => months.includes(monthOf(dateOf(item))))
    .map((item) => ({ date: dateOf(item), paise: amount(item) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function statementBlocks(input: StatementInput) {
  const { months } = input;
  const inPeriod = (date: string) => months.includes(monthOf(date));
  const entries = input.customers.flatMap((c) =>
    c.entries.map((e) => ({ ...e, customerId: c.customerId })),
  );
  const credits = entries.filter((e) => e.amountPaise > 0 && inPeriod(shopDate(e.at)));
  const repayments = entries.filter((e) => e.amountPaise < 0 && inPeriod(shopDate(e.at)));
  const linkSettlements = input.customers
    .flatMap((c) => settle(c.entries).settled)
    .filter((s) => s.viaLink && inPeriod(shopDate(s.repaidAt)));
  const paidBills = input.payables.filter((p) => p.paidAt !== null && inPeriod(p.dueDate));
  const onTime = paidBills.filter((p) => p.paidAt !== null && shopDate(p.paidAt) <= p.dueDate);
  const paidLabels = paidBills.map((p): SourceLabel =>
    p.paidVia === "paytm" ? "verified_payment" : "owner_said",
  );
  const creditsPerCustomer = new Map<string, number>();
  for (const credit of credits) {
    creditsPerCustomer.set(credit.customerId, (creditsPerCustomer.get(credit.customerId) ?? 0) + 1);
  }
  const stock = input.stockValueByMonth;

  return {
    months,
    verified: {
      digitalPayments: {
        label: "verified_payment" as SourceLabel,
        byMonth: byMonth(
          months,
          input.payments,
          (p) => monthOf(shopDate(p.paidAt)),
          (p) => p.amountPaise,
        ),
        rows: rowsOf(
          months,
          input.payments,
          (p) => shopDate(p.paidAt),
          (p) => p.amountPaise,
        ),
      },
      creditRecoveredByLink: {
        label: "verified_payment" as SourceLabel,
        byMonth: byMonth(
          months,
          repayments.filter((r) => r.source === "verified_payment"),
          (r) => monthOf(shopDate(r.at)),
          (r) => -r.amountPaise,
        ),
        rows: rowsOf(
          months,
          repayments.filter((r) => r.source === "verified_payment"),
          (r) => shopDate(r.at),
          (r) => -r.amountPaise,
        ),
        medianDays: median(linkSettlements.map((s) => s.days)),
      },
      supplierBills: {
        label: "supplier_bill" as SourceLabel,
        count: byMonth(
          months,
          input.bills,
          (b) => monthOf(b.billedOn),
          () => 1,
        ),
        byMonth: byMonth(
          months,
          input.bills,
          (b) => monthOf(b.billedOn),
          (b) => b.totalPaise,
        ),
        rows: rowsOf(
          months,
          input.bills,
          (b) => b.billedOn,
          (b) => b.totalPaise,
        ),
      },
    },
    declared: {
      cashSales: {
        label: "owner_said" as SourceLabel,
        byMonth: byMonth(
          months,
          input.dayCloses,
          (d) => monthOf(d.businessDate),
          (d) => d.cashSalesPaise ?? 0,
        ),
        rows: rowsOf(
          months,
          input.dayCloses.filter((d) => d.cashSalesPaise !== null),
          (d) => d.businessDate,
          (d) => d.cashSalesPaise ?? 0,
        ),
      },
      creditGiven: {
        label: "owner_said" as SourceLabel,
        byMonth: byMonth(
          months,
          credits,
          (c) => monthOf(shopDate(c.at)),
          (c) => c.amountPaise,
        ),
        rows: rowsOf(
          months,
          credits,
          (c) => shopDate(c.at),
          (c) => c.amountPaise,
        ),
      },
      creditRecoveredCash: {
        label: "owner_said" as SourceLabel,
        byMonth: byMonth(
          months,
          repayments.filter((r) => r.source !== "verified_payment"),
          (r) => monthOf(shopDate(r.at)),
          (r) => -r.amountPaise,
        ),
        rows: rowsOf(
          months,
          repayments.filter((r) => r.source !== "verified_payment"),
          (r) => shopDate(r.at),
          (r) => -r.amountPaise,
        ),
      },
      billsPaidOnTime: {
        label:
          paidLabels.length > 0
            ? weakest(paidLabels[0], ...paidLabels.slice(1))
            : ("owner_said" as SourceLabel),
        percent: paidBills.length > 0 ? Math.round((onTime.length / paidBills.length) * 100) : null,
        bills: paidBills.length,
        rows: paidBills
          .map((p) => ({
            date: p.dueDate,
            paise: p.amountPaise,
            late: !onTime.includes(p),
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
      regularCreditCustomers: {
        label: "owner_said" as SourceLabel,
        count: [...creditsPerCustomer.values()].filter((count) => count >= 2).length,
      },
      averageStockValue: {
        label: "estimate" as SourceLabel,
        paise:
          stock.length > 0 ? Math.round(stock.reduce((a, b) => a + b, 0) / stock.length) : null,
        rows: months.map((month, index) => ({ date: month, paise: stock[index] ?? 0 })),
      },
      moneyCycleDays: { label: "estimate" as SourceLabel, days: input.moneyCycleDays },
    },
  };
}

export type StatementBlocks = ReturnType<typeof statementBlocks>;
