import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { billPayDecisions, type BillPayDecisions } from "@/lib/bill-pay/decide";
import { mandateJson } from "@/lib/bill-pay/mandate";
import { upiPayUrl } from "@/lib/bill-pay/upi";
import { demoMode } from "@/lib/env";
import { loadShopData, type ShopData } from "@/lib/rotation/load";
import type { BillDecision } from "@/lib/rotation/mandate";
import { indiaTime } from "@/lib/rotation/responses";
import { daysBetween } from "@/lib/time";

// One run of the bill-pay agent (decision of Oct 18): the rules decide pay or hold for every
// unpaid supplier bill, the run and its decisions are saved (agent_runs, agent_steps) so it can
// be explained later, and each bill to pay gets a UPI link for the owner's own UPI app. Nothing
// is paid here: a bill counts as paid only when the owner says so.

function decisionJson(decision: BillDecision, decided: BillPayDecisions, data: ShopData) {
  const upiId = decided.upiIds.get(decision.distributorId) ?? null;
  const paying = decision.decision === "pay" && upiId !== null;
  return {
    payable_id: decision.payableId,
    distributor: decision.distributor,
    distributor_id: decision.distributorId,
    bill_number: decision.billNumber,
    amount_paise: decision.amountPaise,
    label: "supplier_bill" as const,
    due_date: decision.dueDate,
    due_in_days: Math.max(0, daysBetween(data.today, decision.dueDate)),
    overdue_days: decision.overdueDays,
    decision: decision.decision,
    reason: decision.reason,
    needs_more_paise: decision.needsMorePaise,
    upi_id: paying ? upiId : null,
    upi_url: paying
      ? upiPayUrl({
          upiId,
          payee: decision.distributor,
          amountPaise: decision.amountPaise,
          billNumber: decision.billNumber,
        })
      : null,
  };
}

/** What the run decided, as the API and the saved step show it. */
function runJson(runId: string, decided: BillPayDecisions, data: ShopData) {
  const bills = new Map(data.payables.map((p) => [p.id, p]));
  return {
    run_id: runId,
    mandate: mandateJson(decided.mandate),
    money_in_hand_paise: decided.inHand.paise,
    money_in_hand_label: decided.inHand.label,
    keep_in_hand_paise: decided.mandate?.keepInHandPaise ?? 0,
    limit_left_paise: decided.limitLeftPaise,
    in_hand_after_paise: decided.inHandAfterPaise,
    bills_total_paise: decided.decisions.reduce((sum, d) => sum + d.amountPaise, 0),
    festival: decided.festival?.festival ?? null,
    decisions: decided.decisions.map((d) => decisionJson(d, decided, data)),
    paid_this_week: decided.paidThisWeek.map((paid) => ({
      payable_id: paid.payableId,
      distributor: bills.get(paid.payableId)?.distributor ?? "",
      bill_number: bills.get(paid.payableId)?.billNumber ?? null,
      amount_paise: paid.amountPaise,
      paid_at: indiaTime(paid.paidAt),
      label: "owner_said" as const,
    })),
    demo_data: demoMode(),
  };
}

async function saveRun(db: SupabaseClient, shopId: string): Promise<string> {
  const { data, error } = await db
    .from("agent_runs")
    .insert({
      shop_id: shopId,
      agent: "bill_pay",
      status: "done",
      planned_by: "rules",
      finished_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not save the bill-pay run: ${error.message}`);
  return z.object({ id: z.string() }).parse(data).id;
}

export async function runBillPay(db: SupabaseClient, shopId: string) {
  const data = await loadShopData(db, shopId);
  const decided = await billPayDecisions(db, shopId, data);
  const runId = await saveRun(db, shopId);
  const response = runJson(runId, decided, data);
  const step = await db
    .from("agent_steps")
    .insert({ run_id: runId, seq: 0, kind: "plan", name: "decisions", payload: response });
  if (step.error) throw new Error(`Could not save the run's decisions: ${step.error.message}`);
  const pay = decided.decisions.filter((d) => d.decision === "pay");
  await audit(db, shopId, [
    {
      actor: "agent",
      action: "bill_pay.run",
      entityType: "agent_run",
      entityId: runId,
      payload: { pay: pay.map((d) => d.payableId), hold: decided.decisions.length - pay.length },
    },
  ]);
  return response;
}
