import type { SupabaseClient } from "@supabase/supabase-js";
import { billPayDecisions } from "@/lib/bill-pay/decide";
import { HttpError } from "@/lib/http";
import { markPayablePaid } from "@/lib/payables";
import { loadShopData } from "@/lib/rotation/load";

// The owner paid a bill from his own UPI app and tapped "I paid it" (decision of Oct 18). His word
// is the record (owner_said): no provider saw this payment. The rules decide again first, so a
// bill is only recorded under the agent while it still fits his limit and his money in hand.

async function checkRun(db: SupabaseClient, shopId: string, runId: string) {
  const { data, error } = await db
    .from("agent_runs")
    .select("id")
    .eq("id", runId)
    .eq("shop_id", shopId)
    .eq("agent", "bill_pay")
    .maybeSingle();
  if (error) throw new Error(`Could not read the bill-pay run: ${error.message}`);
  if (!data) throw new HttpError(404, "No such bill-pay run.");
}

export async function billPaid(
  db: SupabaseClient,
  shopId: string,
  input: { payableId: string; runId: string },
) {
  await checkRun(db, shopId, input.runId);
  const data = await loadShopData(db, shopId);
  const { decisions } = await billPayDecisions(db, shopId, data);
  const decision = decisions.find((d) => d.payableId === input.payableId);
  if (decision?.decision !== "pay") {
    throw new HttpError(409, "This bill can no longer be paid inside your limit. Look again.");
  }
  await markPayablePaid(db, shopId, input.payableId, "upi", input.runId);
  return {
    payable_id: decision.payableId,
    amount_paise: decision.amountPaise,
    paid_via: "upi" as const,
    label: "owner_said" as const,
  };
}
