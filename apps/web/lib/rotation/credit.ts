import type { Lang } from "@/lib/i18n/languages";
import { weakest, type SourceLabel } from "@/lib/rotation/labels";
import { daysBetween, shopDate } from "@/lib/time";

// Customer credit (spec 9.4, 9.6, 9.7, 9.8): what each customer owes, how long they usually take
// to pay, and so whether they are late, due this week, due later, or have no pattern yet.

/** Credit given is positive, a repayment negative, so a balance is the sum. */
export type LedgerEntry = { at: string; amountPaise: number; source: SourceLabel };

export type CustomerLedger = {
  customerId: string;
  name: string;
  phone: string;
  lang: Lang | null;
  entries: LedgerEntry[];
};

/** One credit paid off: how many days it took and whether a provider saw the payment. */
export type Settlement = { creditPaise: number; days: number; repaidAt: string; viaLink: boolean };

export type CustomerStatus =
  | { kind: "late"; usualDays: number; daysLate: number }
  | { kind: "due"; usualDays: number; dueInDays: number }
  | { kind: "later"; usualDays: number; dueInDays: number }
  | { kind: "unknown"; settled: number };

export type CustomerPosition = {
  customerId: string;
  name: string;
  phone: string;
  lang: Lang | null;
  balancePaise: number;
  label: SourceLabel;
  oldestUnpaid: string;
  status: CustomerStatus;
};

/** Customers expected to pay within this many days count as money coming this week. */
export const DUE_WINDOW_DAYS = 7;
/** Fewer settled credits than this and the customer has no pattern yet. */
export const MIN_SETTLED = 2;

/**
 * Matches each repayment to the oldest credit still unpaid (spec 9.6). Returns the credits it
 * paid off and those still open, oldest first, with what is left of each.
 */
export function settle(entries: LedgerEntry[]): {
  settled: Settlement[];
  open: { at: string; remainingPaise: number }[];
} {
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  const open: { at: string; creditPaise: number; remainingPaise: number }[] = [];
  const settled: Settlement[] = [];
  for (const entry of sorted) {
    if (entry.amountPaise > 0) {
      open.push({
        at: entry.at,
        creditPaise: entry.amountPaise,
        remainingPaise: entry.amountPaise,
      });
      continue;
    }
    let left = -entry.amountPaise;
    while (left > 0 && open.length > 0) {
      const oldest = open[0];
      const used = Math.min(oldest.remainingPaise, left);
      oldest.remainingPaise -= used;
      left -= used;
      if (oldest.remainingPaise === 0) {
        settled.push({
          creditPaise: oldest.creditPaise,
          days: daysBetween(shopDate(oldest.at), shopDate(entry.at)),
          repaidAt: entry.at,
          viaLink: entry.source === "verified_payment",
        });
        open.shift();
      }
    }
  }
  return { settled, open: open.map(({ at, remainingPaise }) => ({ at, remainingPaise })) };
}

/** The median days a customer takes to pay, or null with fewer than two settled credits. */
export function usualRepayDays(settled: Settlement[]): number | null {
  if (settled.length < MIN_SETTLED) return null;
  const days = settled.map((s) => s.days).sort((a, b) => a - b);
  const middle = Math.floor(days.length / 2);
  return days.length % 2 === 1 ? days[middle] : (days[middle - 1] + days[middle]) / 2;
}

/** Where a customer stands today; null when they owe nothing. */
export function positionOf(customer: CustomerLedger, today: string): CustomerPosition | null {
  const balancePaise = customer.entries.reduce((sum, e) => sum + e.amountPaise, 0);
  const { settled, open } = settle(customer.entries);
  if (balancePaise <= 0 || open.length === 0) return null;
  const oldestUnpaid = shopDate(open[0].at);
  const age = daysBetween(oldestUnpaid, today);
  const usualDays = usualRepayDays(settled);
  const [first, ...rest] = customer.entries.map((e) => e.source);
  return {
    customerId: customer.customerId,
    name: customer.name,
    phone: customer.phone,
    lang: customer.lang,
    balancePaise,
    label: weakest(first, ...rest),
    oldestUnpaid,
    status: statusOf(usualDays, age, settled.length),
  };
}

function statusOf(usualDays: number | null, age: number, settledCount: number): CustomerStatus {
  if (usualDays === null) return { kind: "unknown", settled: settledCount };
  const left = usualDays - age;
  if (left < 0) return { kind: "late", usualDays, daysLate: age - usualDays };
  if (left <= DUE_WINDOW_DAYS) return { kind: "due", usualDays, dueInDays: left };
  return { kind: "later", usualDays, dueInDays: left };
}

/**
 * Who to collect from first (spec 9.8): late payers, most days past their usual first; then
 * those with no pattern yet, by amount; then everyone else, by amount.
 */
export function collectOrder(positions: CustomerPosition[]): CustomerPosition[] {
  const rank = (p: CustomerPosition) =>
    p.status.kind === "late" ? 0 : p.status.kind === "unknown" ? 1 : 2;
  return [...positions].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.status.kind === "late" && b.status.kind === "late") {
      return b.status.daysLate - a.status.daysLate || b.balancePaise - a.balancePaise;
    }
    return b.balancePaise - a.balancePaise;
  });
}

function total(positions: CustomerPosition[]) {
  const paise = positions.reduce((sum, p) => sum + p.balancePaise, 0);
  const labels = positions.map((p) => p.label);
  const label = labels.length > 0 ? weakest(labels[0], ...labels.slice(1)) : "owner_said";
  return { paise, label, customers: positions.length };
}

/** Everything customers owe (spec 9.4). */
export function withCustomers(positions: CustomerPosition[]) {
  return total(positions);
}

/** Customers who usually pay within the coming week and are not late (spec 9.7). */
export function likelyFromCustomers(positions: CustomerPosition[]) {
  return total(positions.filter((p) => p.status.kind === "due"));
}

/** What late payers owe: shown on its own, never counted as money coming in (spec 9.7). */
export function lateTotal(positions: CustomerPosition[]) {
  return total(positions.filter((p) => p.status.kind === "late"));
}
