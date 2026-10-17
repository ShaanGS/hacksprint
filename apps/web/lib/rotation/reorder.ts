import type { ShopReceipt } from "@/lib/rotation/load";
import type { ShelfItem } from "@/lib/rotation/stock";

// The reorder agent's list (decision of Oct 17): what runs out this week, at the quantity of its
// last bill and that bill's price, grouped by the distributor who sent it. Slow stock is never
// "low", so money already stuck on the shelf is never ordered again.

export type ReorderLine = {
  productId: string;
  name: string;
  art: string;
  unit: string;
  qty: number;
  unitCostPaise: number;
  linePaise: number;
  billedOn: string;
};

export type ReorderGroup = {
  distributorId: string;
  distributor: string;
  lines: ReorderLine[];
  totalPaise: number;
};

/** The product's latest confirmed bill line that names its distributor. */
export function lastBillLine(productId: string, receipts: ShopReceipt[]): ShopReceipt | null {
  return (
    receipts
      .filter((r) => r.productId === productId && r.distributorId !== null)
      .sort((a, b) => b.at.localeCompare(a.at))[0] ?? null
  );
}

/** A quantity at a bill price, in whole paise. */
export function linePaise(qty: number, unitCostPaise: number): number {
  return Math.round(qty * unitCostPaise);
}

export function reorderPlan(items: ShelfItem[], receipts: ShopReceipt[]): ReorderGroup[] {
  const groups = new Map<string, ReorderGroup>();
  for (const item of items.filter((i) => i.tags.includes("low"))) {
    const last = lastBillLine(item.product.id, receipts);
    if (!last?.distributorId || !last.distributor) continue;
    const group = groups.get(last.distributorId) ?? {
      distributorId: last.distributorId,
      distributor: last.distributor,
      lines: [],
      totalPaise: 0,
    };
    const line = linePaise(last.qty, last.unitCostPaise);
    group.lines.push({
      productId: item.product.id,
      name: item.product.name,
      art: item.product.art,
      unit: item.product.unit,
      qty: last.qty,
      unitCostPaise: last.unitCostPaise,
      linePaise: line,
      billedOn: last.billedOn,
    });
    group.totalPaise += line;
    groups.set(last.distributorId, group);
  }
  return [...groups.values()].sort((a, b) => a.distributor.localeCompare(b.distributor));
}

/** What the agent left out, so the owner sees why the list is short. */
export function skipped(items: ShelfItem[], receipts: ShopReceipt[]) {
  return {
    slow: items.filter((i) => i.tags.includes("slow")).length,
    lasting: items.filter((i) => typeof i.daysLeft === "number" && i.tags.length === 0).length,
    noBill: items
      .filter((i) => i.tags.includes("low") && !lastBillLine(i.product.id, receipts))
      .map((i) => i.product.name),
  };
}

/** The sum of some lines, in paise. */
export function linesTotalPaise(lines: { linePaise: number }[]): number {
  return lines.reduce((sum, line) => sum + line.linePaise, 0);
}
