import type { SupabaseClient } from "@supabase/supabase-js";
import { billPayDecisions } from "@/lib/bill-pay/decide";
import type { BillLimitFacts } from "@/lib/planner/facts";
import type { ShopData } from "@/lib/rotation/load";
import { decideBills, type BillDecision } from "@/lib/rotation/mandate";
import { snapshotOf } from "@/lib/rotation/snapshot";

// What the bill-pay rules decide for this week's bills, for the planner's check_bill_limit tool:
// the decision with today's money in hand, and the decision if the late payers pay first, so the
// planner can see that collecting is what makes a bill payable. Both come from the same rules
// the bill-pay agent itself uses (lib/rotation/mandate.ts).

export async function billLimitFacts(
  db: SupabaseClient,
  shopId: string,
  data: ShopData,
): Promise<BillLimitFacts> {
  const decided = await billPayDecisions(db, shopId, data);
  const latePaise = snapshotOf(data).week.late.paise;
  const ifCollected = decideBills({
    payables: data.payables.map((p) => ({
      ...p,
      festivalOrder: p.id === decided.festival?.payableId,
    })),
    today: data.today,
    moneyInHandPaise: decided.inHand.paise + latePaise,
    mandate: decided.mandate,
    paidByAgentLast7DaysPaise: decided.paidThisWeek.reduce((sum, p) => sum + p.amountPaise, 0),
    upiIdOf: (distributorId) => decided.upiIds.get(distributorId) ?? null,
  });
  return {
    mandate: decided.mandate
      ? {
          weeklyLimitPaise: decided.mandate.weeklyLimitPaise,
          keepInHandPaise: decided.mandate.keepInHandPaise,
        }
      : null,
    limitLeftPaise: decided.limitLeftPaise,
    decisions: decided.decisions.map(slim),
    ifCollected: ifCollected.decisions.map(slim),
  };
}

function slim(row: BillDecision) {
  return {
    payableId: row.payableId,
    distributor: row.distributor,
    amountPaise: row.amountPaise,
    decision: row.decision,
    reason: row.reason,
    needsMorePaise: row.needsMorePaise,
  };
}
