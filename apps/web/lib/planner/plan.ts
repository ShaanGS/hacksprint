import { z } from "zod";
import type { PlannerFacts } from "@/lib/planner/facts";
import {
  fix,
  guardrailReport,
  stop,
  type Dropped,
  type Fixed,
  type HeldBill,
} from "@/lib/planner/guardrails";
import { planReasons, type Seen } from "@/lib/planner/tools";
import type { SourceLabel } from "@/lib/rotation/labels";
import { weakest } from "@/lib/rotation/labels";
import { planActions, planEffects, type PlanAction } from "@/lib/rotation/plan-effects";

// The plan as the model hands it over has no numbers and no words, only actions, ids and
// reason codes (rule 1). Here it passes the guardrails (guardrails.ts): it is checked against
// what the run's tools showed and the owner's own limits, every stop is named, the amounts come
// from the facts, and planEffects works out the week after each step.

const MAX_STEPS = 5;

export const rawPlan = z.object({
  steps: z
    .array(
      z.object({
        action: z.enum(planActions),
        ids: z.array(z.string()).max(10).optional(),
        reason: z.enum(planReasons),
      }),
    )
    .max(10),
});
export type RawPlan = z.infer<typeof rawPlan>;
export type PlanReason = (typeof planReasons)[number];

type CheckedStep = {
  action: PlanAction;
  reason: PlanReason;
  ids: string[];
  names: string[];
  amountPaise: number;
  label: SourceLabel;
};

const opens: Record<PlanAction, "collect" | "pay" | "reorder" | "bank"> = {
  collect: "collect",
  pay_bills: "pay",
  reorder: "reorder",
  move_festival_order: "bank",
  check_loan: "bank",
};

/** Keeps the steps that pass every guardrail; names each one stopped and each fix made. */
export function checkPlan(plan: RawPlan, facts: PlannerFacts, seen: Seen) {
  const steps: CheckedStep[] = [];
  const dropped: Dropped[] = [];
  const fixed: Fixed[] = [];
  const has = (action: PlanAction) => steps.some((step) => step.action === action);

  // Collect first: what is owed comes in before anything that costs money.
  const at = plan.steps.findIndex((step) => step.action === "collect");
  const ordered =
    at > 0 ? [plan.steps[at], ...plan.steps.slice(0, at), ...plan.steps.slice(at + 1)] : plan.steps;
  if (at > 0) fixed.push(fix("collect_moved_first"));

  for (const step of ordered) {
    if (has(step.action)) {
      dropped.push(stop(step.action, "repeated"));
      continue;
    }
    const checked = checkStep(step, facts, seen, has("collect"));
    if ("why" in checked) dropped.push(checked);
    else steps.push(checked);
  }
  // Moving the festival order out of the week makes the loan for it unnecessary.
  if (has("move_festival_order") && has("check_loan")) {
    steps.splice(
      steps.findIndex((step) => step.action === "check_loan"),
      1,
    );
    dropped.push(stop("check_loan", "order_moved"));
  }
  return { steps: steps.slice(0, MAX_STEPS), dropped, fixed };
}

function checkStep(
  step: RawPlan["steps"][number],
  facts: PlannerFacts,
  seen: Seen,
  collectFirst: boolean,
): CheckedStep | Dropped {
  const { action, reason } = step;
  const ids = step.ids ?? [];
  switch (action) {
    case "collect": {
      const rows = facts.latePayers.filter(
        (row) => ids.includes(row.customerId) && seen.customers.has(row.customerId),
      );
      if (rows.length === 0) {
        return stop(action, facts.latePayers.length === 0 ? "no_late_payers" : "unknown_customer");
      }
      return {
        action,
        reason,
        ids: rows.map((row) => row.customerId),
        names: rows.map((row) => row.name),
        amountPaise: rows.reduce((sum, row) => sum + row.owesPaise, 0),
        label: rows.reduce<SourceLabel>(
          (label, row) => weakest(label, row.label),
          "verified_payment",
        ),
      };
    }
    case "pay_bills": {
      // A bill payable now, or one that becomes payable once the late payers pay, when the
      // plan collects first. Never a bill the owner's own rules hold.
      const limit = facts.billLimit;
      const fitsNow = (limit?.decisions ?? []).filter((row) => row.decision === "pay");
      const fitsLater = collectFirst
        ? (limit?.ifCollected ?? []).filter((row) => row.decision === "pay")
        : [];
      const offered = [
        ...fitsNow.filter((row) => seen.payablesToPay.has(row.payableId)),
        ...fitsLater.filter((row) => seen.payablesIfCollected.has(row.payableId)),
      ];
      const rows = offered.filter(
        (row, index) =>
          ids.includes(row.payableId) &&
          offered.findIndex((r) => r.payableId === row.payableId) === index,
      );
      if (rows.length > 0) {
        return {
          action,
          reason,
          ids: rows.map((row) => row.payableId),
          names: rows.map((row) => row.distributor),
          amountPaise: rows.reduce((sum, row) => sum + row.amountPaise, 0),
          label: "supplier_bill",
        };
      }
      return fitsNow.length + fitsLater.length === 0
        ? stop(action, "no_bill_fits_limit", heldBills(facts, collectFirst))
        : stop(action, "unknown_bill");
    }
    case "reorder": {
      const rows = facts.reorder.filter(
        (row) => ids.includes(row.distributorId) && seen.distributors.has(row.distributorId),
      );
      if (rows.length === 0) {
        return stop(
          action,
          facts.reorder.length === 0 ? "nothing_to_reorder" : "unknown_distributor",
        );
      }
      return {
        action,
        reason,
        ids: rows.map((row) => row.distributorId),
        names: rows.map((row) => row.distributor),
        amountPaise: rows.reduce((sum, row) => sum + row.totalPaise, 0),
        label: "supplier_bill",
      };
    }
    case "move_festival_order": {
      const festival = facts.loan.festival;
      if (!festival) return stop(action, "no_festival_order");
      if (!seen.festival) return stop(action, "festival_not_checked");
      return {
        action,
        reason,
        ids: [festival.payableId],
        names: [festival.distributor],
        amountPaise: festival.dueThisWeek ? festival.totalPaise : 0,
        label: "supplier_bill",
      };
    }
    case "check_loan":
      if (facts.loan.loanNeededPaise <= 0) return stop(action, "no_loan_needed");
      // The loan size already counts the late payers' money in, so it needs the collect step.
      if (facts.latePayers.length > 0 && !collectFirst) return stop(action, "loan_before_collect");
      if (!seen.loan) return stop(action, "loan_not_checked");
      return {
        action,
        reason,
        ids: [],
        names: [],
        amountPaise: facts.loan.loanNeededPaise,
        label: facts.loan.label,
      };
  }
}

/** The bills the owner's limit holds, with the numbers that explain why, all from code. */
function heldBills(facts: PlannerFacts, collectFirst: boolean): HeldBill[] {
  const limit = facts.billLimit;
  if (!limit) return [];
  return (collectFirst ? limit.ifCollected : limit.decisions)
    .filter((row) => row.decision === "hold")
    .map((row) => ({
      distributor: row.distributor,
      amountPaise: row.amountPaise,
      reason: row.reason,
      needsMorePaise: row.needsMorePaise,
      dueInDays: facts.bills.find((bill) => bill.payableId === row.payableId)?.dueInDays ?? 0,
      keepPaise: limit.mandate?.keepInHandPaise ?? 0,
      festival: facts.loan.festival?.festival ?? null,
    }));
}

/** The plan for the owner's screen: each step with its money, the week after it, and the checks. */
export function planResponse(
  checked: ReturnType<typeof checkPlan>,
  facts: PlannerFacts,
  run: { id: string; plannedBy: "model" | "rules"; rulesBecause?: "no_answer" | "plan_blocked" },
) {
  const effects = planEffects(
    { gapPaise: facts.week.gapPaise, inHandPaise: facts.week.inHandPaise, label: facts.week.label },
    checked.steps,
  );
  return {
    run_id: run.id,
    planned_by: run.plannedBy,
    rules_because: run.plannedBy === "rules" ? (run.rulesBecause ?? "no_answer") : null,
    as_of: facts.asOf,
    week: { state: facts.week.state, gap_paise: facts.week.gapPaise, label: facts.week.label },
    mudra_band: facts.loan.band,
    steps: checked.steps.map((step, index) => ({
      action: step.action,
      reason: step.reason,
      ids: step.ids,
      names: step.names,
      amount_paise: step.amountPaise,
      label: step.label,
      after_label: effects[index].label,
      gap_after_paise: effects[index].gapAfterPaise,
      in_hand_after_paise: effects[index].inHandAfterPaise,
      opens: opens[step.action],
    })),
    guardrails: guardrailReport(checked.dropped, checked.fixed),
    dropped: checked.dropped.map((stopped) => ({
      action: stopped.action,
      why: stopped.why,
      rule: stopped.rule,
      held: (stopped.held ?? []).map((bill) => ({
        distributor: bill.distributor,
        amount_paise: bill.amountPaise,
        reason: bill.reason,
        needs_more_paise: bill.needsMorePaise,
        due_in_days: bill.dueInDays,
        keep_paise: bill.keepPaise,
        festival: bill.festival,
      })),
    })),
    fixed: checked.fixed,
  };
}

export type PlanResponse = ReturnType<typeof planResponse>;
