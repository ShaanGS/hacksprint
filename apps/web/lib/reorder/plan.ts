import type { SupabaseClient } from "@supabase/supabase-js";
import { loadShopData } from "@/lib/rotation/load";
import { reorderPlan, skipped, type ReorderGroup } from "@/lib/rotation/reorder";
import { snapshotOf } from "@/lib/rotation/snapshot";

// The reorder agent's plan, worked out on the server from the shop's own records: what runs out
// this week, at the last bill's quantity and price. The phone only ever sends back which lines the
// owner approved.

export async function reorderPlanFor(db: SupabaseClient, shopId: string) {
  const data = await loadShopData(db, shopId);
  const snapshot = snapshotOf(data);
  return {
    groups: reorderPlan(snapshot.items, data.receipts),
    skipped: skipped(snapshot.items, data.receipts),
    stuckPaise: snapshot.stuck.paise,
  };
}

export type ReorderPlanFor = Awaited<ReturnType<typeof reorderPlanFor>>;

export function groupJson(group: ReorderGroup) {
  return {
    distributor_id: group.distributorId,
    distributor: group.distributor,
    total_paise: group.totalPaise,
    label: "supplier_bill" as const,
    lines: group.lines.map((line) => ({
      product_id: line.productId,
      name: line.name,
      art: line.art,
      unit: line.unit,
      qty: line.qty,
      unit_cost_paise: line.unitCostPaise,
      line_paise: line.linePaise,
      billed_on: line.billedOn,
    })),
  };
}

export function reorderResponse(plan: ReorderPlanFor) {
  return {
    groups: plan.groups.map(groupJson),
    skipped: {
      slow: plan.skipped.slow,
      stuck_paise: plan.stuckPaise,
      lasting: plan.skipped.lasting,
      no_bill: plan.skipped.noBill,
    },
  };
}
