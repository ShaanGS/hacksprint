import type { PlannerFacts } from "@/lib/planner/facts";
import type { RawPlan } from "@/lib/planner/plan";
import type { Seen } from "@/lib/planner/tools";

// The plan when the model cannot answer (no key, a timeout, the free tier's daily limit): the
// same output, from fixed rules, so the owner always gets a plan and the screen says how it was
// made. The order is the advice we give anyway: collect what is owed before borrowing, pay what
// the owner's own limit allows, restock what runs out, and only then the cheapest loan.

/** Everything in the facts counts as seen: the rules read it all. */
export function seenAll(facts: PlannerFacts): Seen {
  return {
    customers: new Set(facts.latePayers.map((row) => row.customerId)),
    payablesToPay: new Set(
      (facts.billLimit?.decisions ?? [])
        .filter((row) => row.decision === "pay")
        .map((row) => row.payableId),
    ),
    distributors: new Set(facts.reorder.map((row) => row.distributorId)),
    festival: facts.loan.festival !== null,
    loan: true,
  };
}

export function rulesPlan(facts: PlannerFacts): RawPlan {
  const steps: RawPlan["steps"] = [];
  if (facts.latePayers.length > 0) {
    steps.push({
      action: "collect",
      ids: facts.latePayers.slice(0, 5).map((row) => row.customerId),
      reason: "late_payers_first",
    });
  }
  const payable = (facts.billLimit?.decisions ?? []).filter((row) => row.decision === "pay");
  if (payable.length > 0) {
    steps.push({
      action: "pay_bills",
      ids: payable.map((row) => row.payableId),
      reason: "within_your_limit",
    });
  }
  if (facts.reorder.length > 0) {
    steps.push({
      action: "reorder",
      ids: facts.reorder.map((row) => row.distributorId),
      reason: "runs_out_soon",
    });
  }
  if (facts.loan.loanNeededPaise > 0) {
    steps.push({ action: "check_loan", reason: "cheaper_than_app_loans" });
  }
  return { steps };
}
