import type { SourceLabel } from "@/lib/rotation/labels";
import { weeksBetween } from "@/lib/time";

// Stock is an estimate (spec 9.1 to 9.3, 9.9, 9.10): a kirana does not scan each sale, so stock
// is the last shelf count plus what bills brought minus the usual sales since. Only the top 20
// products by money are counted; the rest get their speed from how often bills show them bought.

export const COUNT_TOP_N = 20;
export const REBUY_WEEKS = 8;
/** Bought at least this many times in 8 weeks before a re-buy rate is trusted. */
export const MIN_REBUYS = 2;
export const LOW_DAYS = 7;
export const SLOW_DAYS = 30;

export type Count = { productId: string; qty: number; at: string };
export type Receipt = { productId: string; qty: number; at: string; unitCostPaise: number };
export type ShelfProduct = {
  id: string;
  name: string;
  art: string;
  unit: string;
  packSize: string | null;
};

export type WeeklySales = { perWeek: number; from: "counts" | "rebuy" };
export type DaysLeft = number | "not_moving" | null;

export type ShelfItem = {
  product: ShelfProduct;
  estimateQty: number;
  countedAt: string | null;
  weeklySales: WeeklySales | null;
  daysLeft: DaysLeft;
  unitCostPaise: number | null;
  valuePaise: number | null;
  tags: ("low" | "slow")[];
  countAsked: boolean;
};

const byTime = <T extends { at: string }>(list: T[]) =>
  [...list].sort((a, b) => a.at.localeCompare(b.at));

function receivedBetween(receipts: Receipt[], after: string, upTo: string): number {
  return receipts.filter((r) => r.at > after && r.at <= upTo).reduce((sum, r) => sum + r.qty, 0);
}

/**
 * How much of a product sells in a week (spec 9.2): from the last two counts and what came in
 * between them; with fewer counts, from the re-buy rate over 8 weeks; else not known.
 */
export function weeklySales(counts: Count[], receipts: Receipt[], now: Date): WeeklySales | null {
  const sorted = byTime(counts);
  if (sorted.length >= 2) {
    const previous = sorted[sorted.length - 2];
    const last = sorted[sorted.length - 1];
    const weeks = weeksBetween(previous.at, last.at);
    if (weeks > 0) {
      const sold = previous.qty + receivedBetween(receipts, previous.at, last.at) - last.qty;
      return { perWeek: Math.max(0, sold / weeks), from: "counts" };
    }
  }
  const since = new Date(now.getTime() - REBUY_WEEKS * 7 * 86_400_000).toISOString();
  const recent = receipts.filter((r) => r.at > since && r.at <= now.toISOString());
  if (recent.length < MIN_REBUYS) return null;
  return { perWeek: recent.reduce((sum, r) => sum + r.qty, 0) / REBUY_WEEKS, from: "rebuy" };
}

/**
 * Stock now (spec 9.1): last count plus received since, minus weekly sales times the weeks
 * since, never below zero. Never counted: received in 8 weeks minus 8 weeks of sales.
 */
export function stockEstimate(
  counts: Count[],
  receipts: Receipt[],
  sales: WeeklySales | null,
  now: Date,
): { qty: number; countedAt: string | null } {
  const perWeek = sales?.perWeek ?? 0;
  const last = byTime(counts).at(-1);
  if (last) {
    const qty =
      last.qty +
      receivedBetween(receipts, last.at, now.toISOString()) -
      perWeek * weeksBetween(last.at, now);
    return { qty: Math.max(0, qty), countedAt: last.at };
  }
  const since = new Date(now.getTime() - REBUY_WEEKS * 7 * 86_400_000).toISOString();
  const received = receivedBetween(receipts, since, now.toISOString());
  return { qty: Math.max(0, received - perWeek * REBUY_WEEKS), countedAt: null };
}

/**
 * Days the stock lasts (spec 9.9). A product never counted has no stock worth dividing (9.1
 * gives it zero), so it shows no days until it is counted rather than a false "low".
 */
export function daysLeft(qty: number, sales: WeeklySales | null, counted: boolean): DaysLeft {
  if (!counted || !sales) return null;
  if (sales.perWeek === 0) return "not_moving";
  return qty / (sales.perWeek / 7);
}

function tagsFor(days: DaysLeft): ("low" | "slow")[] {
  if (days === "not_moving") return ["slow"];
  if (days === null) return [];
  if (days < LOW_DAYS) return ["low"];
  if (days > SLOW_DAYS) return ["slow"];
  return [];
}

/** Every product's estimate, value and days left, with the top 20 by value asked to be counted. */
export function shelf(
  products: ShelfProduct[],
  counts: Count[],
  receipts: Receipt[],
  now: Date,
): ShelfItem[] {
  const items = products.map((product) => {
    const mine = counts.filter((c) => c.productId === product.id);
    const bought = receipts.filter((r) => r.productId === product.id && r.at <= now.toISOString());
    const sales = weeklySales(mine, bought, now);
    const estimate = stockEstimate(mine, bought, sales, now);
    const unitCostPaise = byTime(bought).at(-1)?.unitCostPaise ?? null;
    const days = daysLeft(estimate.qty, sales, estimate.countedAt !== null);
    return {
      product,
      estimateQty: estimate.qty,
      countedAt: estimate.countedAt,
      weeklySales: sales,
      daysLeft: days,
      unitCostPaise,
      valuePaise: unitCostPaise === null ? null : Math.round(estimate.qty * unitCostPaise),
      tags: tagsFor(days),
      countAsked: false,
    };
  });
  const top = [...items]
    .filter((item) => item.valuePaise !== null)
    .sort((a, b) => (b.valuePaise ?? 0) - (a.valuePaise ?? 0))
    .slice(0, COUNT_TOP_N);
  return items.map((item) => ({ ...item, countAsked: top.includes(item) }));
}

/** Money on the shelf at cost (spec 9.3); products with no bill cost are listed, never guessed. */
export function onShelf(items: ShelfItem[]) {
  return {
    paise: items.reduce((sum, item) => sum + (item.valuePaise ?? 0), 0),
    label: "estimate" as SourceLabel,
    costUnknown: items.filter((item) => item.unitCostPaise === null).map((item) => item.product),
  };
}

/** Money stuck in slow stock (spec 9.10): what lasts over 30 days or does not move. */
export function stuckMoney(items: ShelfItem[]) {
  const stuck = items
    .filter((item) => item.tags.includes("slow") && item.valuePaise !== null)
    .sort((a, b) => (b.valuePaise ?? 0) - (a.valuePaise ?? 0));
  return {
    paise: stuck.reduce((sum, item) => sum + (item.valuePaise ?? 0), 0),
    label: "estimate" as SourceLabel,
    items: stuck,
  };
}
