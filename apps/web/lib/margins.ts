import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Product } from "@/lib/catalog";

// Profit per item and the cheaper distributor (spec C4), worked out by code from confirmed
// bill lines: the selling price minus the latest cost, and each distributor's latest cost.

export type CostLine = {
  productId: string;
  distributorId: string;
  distributor: string;
  unitCostPaise: number;
  at: string;
};

export type Margin = {
  productId: string;
  name: string;
  art: string;
  pricePaise: number;
  costPaise: number;
  distributor: string;
  profitPaise: number;
  /** Profit as a whole percent of the selling price. */
  percent: number;
  /** Another distributor's latest cost, when it is lower than what the shop paid last. */
  cheaper: { distributor: string; costPaise: number; savingPaise: number } | null;
};

const costRow = z.object({
  product_id: z.string(),
  unit_cost_paise: z.number().int(),
  created_at: z.string(),
  bills: z.object({ distributors: z.object({ id: z.string(), name: z.string() }) }),
});

export async function loadCostLines(db: SupabaseClient, shopId: string): Promise<CostLine[]> {
  const { data, error } = await db
    .from("bill_items")
    .select(
      "product_id, unit_cost_paise, created_at, bills!inner(shop_id, status, distributors(id, name))",
    )
    .eq("bills.shop_id", shopId)
    .eq("bills.status", "confirmed");
  if (error) throw new Error(`Could not read the bill lines: ${error.message}`);
  return z
    .array(costRow)
    .parse(data)
    .map((row) => ({
      productId: row.product_id,
      distributorId: row.bills.distributors.id,
      distributor: row.bills.distributors.name,
      unitCostPaise: row.unit_cost_paise,
      at: row.created_at,
    }));
}

/** Every billed product's margin; those a cheaper distributor could improve come first. */
export function margins(products: Product[], lines: CostLine[]): Margin[] {
  const result: Margin[] = [];
  for (const product of products) {
    const mine = lines.filter((line) => line.productId === product.id);
    if (mine.length === 0) continue;
    const latest = mine.reduce((a, b) => (b.at > a.at ? b : a));
    // Each distributor's own latest cost, so an old cheap bill does not count as today's price.
    const byDistributor = new Map<string, CostLine>();
    for (const line of mine) {
      const seen = byDistributor.get(line.distributorId);
      if (!seen || line.at > seen.at) byDistributor.set(line.distributorId, line);
    }
    const cheapest = [...byDistributor.values()].reduce((a, b) =>
      b.unitCostPaise < a.unitCostPaise ? b : a,
    );
    const profitPaise = product.pricePaise - latest.unitCostPaise;
    result.push({
      productId: product.id,
      name: product.name,
      art: product.art,
      pricePaise: product.pricePaise,
      costPaise: latest.unitCostPaise,
      distributor: latest.distributor,
      profitPaise,
      percent: Math.round((profitPaise / product.pricePaise) * 100),
      cheaper:
        cheapest.distributorId !== latest.distributorId &&
        cheapest.unitCostPaise < latest.unitCostPaise
          ? {
              distributor: cheapest.distributor,
              costPaise: cheapest.unitCostPaise,
              savingPaise: latest.unitCostPaise - cheapest.unitCostPaise,
            }
          : null,
    });
  }
  return result.sort(
    (a, b) =>
      (b.cheaper?.savingPaise ?? 0) - (a.cheaper?.savingPaise ?? 0) || a.percent - b.percent,
  );
}
