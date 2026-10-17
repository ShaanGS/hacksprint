import type { Snapshot } from "@/lib/rotation/snapshot";
import type { ShelfItem } from "@/lib/rotation/stock";
import { indiaTime } from "@/lib/rotation/responses";

// The Stock screen's JSON (C1, C2): every product's estimate, days left and value.

function round(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function itemJson(item: ShelfItem) {
  return {
    product_id: item.product.id,
    name: item.product.name,
    art: item.product.art,
    unit: item.product.unit,
    estimate_qty: round(item.estimateQty, 1),
    label: "estimate",
    counted_at: item.countedAt === null ? null : indiaTime(item.countedAt),
    weekly_sales: item.weeklySales === null ? null : round(item.weeklySales.perWeek, 1),
    sales_from: item.weeklySales?.from ?? null,
    days_left: typeof item.daysLeft === "number" ? round(item.daysLeft, 1) : item.daysLeft,
    unit_cost_paise: item.unitCostPaise,
    value_paise: item.valuePaise,
    tags: item.tags,
    count_asked: item.countAsked,
  };
}

export function stockResponse(snapshot: Snapshot) {
  return {
    on_shelf_paise: snapshot.onShelf.paise,
    label: snapshot.onShelf.label,
    cost_unknown: snapshot.onShelf.costUnknown.map((p) => ({ product_id: p.id, name: p.name })),
    products: [...snapshot.items]
      .sort((a, b) => (b.valuePaise ?? -1) - (a.valuePaise ?? -1))
      .map(itemJson),
  };
}

export function stuckResponse(snapshot: Snapshot) {
  return {
    stuck_paise: snapshot.stuck.paise,
    label: snapshot.stuck.label,
    products: snapshot.stuck.items.map(itemJson),
  };
}
