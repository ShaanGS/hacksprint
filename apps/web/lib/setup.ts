import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { broadcastChanged } from "@/lib/realtime";
import { weeklyCosts, type Cost } from "@/lib/rotation/forecast";

// The one-time setup (B7): what the shop spends each week or month outside supplier bills.

const costRow = z.object({
  kind: z.string(),
  amount_paise: z.number().int(),
  period: z.enum(["week", "month"]),
});

export const costKinds = ["rent", "staff", "home", "cash_purchases", "other"] as const;

export async function loadCosts(db: SupabaseClient, shopId: string): Promise<Cost[]> {
  const { data, error } = await db
    .from("shop_costs")
    .select("kind, amount_paise, period")
    .eq("shop_id", shopId);
  if (error) throw new Error(`Could not read the weekly costs: ${error.message}`);
  return z
    .array(costRow)
    .parse(data)
    .map((c) => ({ kind: c.kind, amountPaise: c.amount_paise, period: c.period }));
}

export function costsResponse(costs: Cost[]) {
  const weekly = weeklyCosts(costs);
  return {
    weekly_paise: weekly.paise,
    label: weekly.label,
    costs: costs.map((c) => ({ kind: c.kind, amount_paise: c.amountPaise, period: c.period })),
  };
}

/** Replaces the costs with what the owner confirmed. */
export async function saveCosts(db: SupabaseClient, shopId: string, costs: Cost[]) {
  const cleared = await db.from("shop_costs").delete().eq("shop_id", shopId);
  if (cleared.error) throw new Error(`Could not update the costs: ${cleared.error.message}`);
  if (costs.length > 0) {
    const { error } = await db.from("shop_costs").insert(
      costs.map((c) => ({
        shop_id: shopId,
        kind: c.kind,
        amount_paise: c.amountPaise,
        period: c.period,
      })),
    );
    if (error) throw new Error(`Could not save the costs: ${error.message}`);
  }
  await audit(db, shopId, [
    { actor: "owner", action: "setup.costs", payload: { costs: costs.length } },
  ]);
  await broadcastChanged(db, shopId, ["rotation"]);
}
