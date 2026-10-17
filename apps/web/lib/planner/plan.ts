import { z } from "zod";
import type { PlannerFacts } from "@/lib/planner/facts";
import { planReasons, type Seen } from "@/lib/planner/tools";
import type { SourceLabel } from "@/lib/rotation/labels";
import { weakest } from "@/lib/rotation/labels";
import { planActions, planEffects, type PlanAction } from "@/lib/rotation/plan-effects";

// The plan as the model hands it over has no numbers and no words, only actions, ids and
// reason codes (rule 1). Here it is checked against what the run's tools showed, the amounts
// come from the facts, and planEffects works out the week after each step.

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

/** Keeps the steps whose ids the tools showed and whose action makes sense today. */
export function checkPlan(plan: RawPlan, facts: PlannerFacts, seen: Seen) {
  const steps: CheckedStep[] = [];
  const dropped: { action: PlanAction; why: string }[] = [];
  const has = (action: PlanAction) => steps.some((step) => step.action === action);

  for (const step of plan.steps) {
    const ids = step.ids ?? [];
    if (has(step.action)) {
      dropped.push({ action: step.action, why: "repeated" });
      continue;
    }
    const checked = checkStep(step.action, step.reason, ids, facts, seen, has("collect"));
    if (typeof checked === "string") dropped.push({ action: step.action, why: checked });
    else steps.push(checked);
  }
  // Moving the festival order out of the week makes the loan for it unnecessary.
  if (has("move_festival_order") && has("check_loan")) {
    steps.splice(
      steps.findIndex((step) => step.action === "check_loan"),
      1,
    );
    dropped.push({ action: "check_loan", why: "order_moved" });
  }
  return { steps: steps.slice(0, MAX_STEPS), dropped };
}

function checkStep(
  action: PlanAction,
  reason: PlanReason,
  ids: string[],
  facts: PlannerFacts,
  seen: Seen,
  collectFirst: boolean,
): CheckedStep | string {
  const step = { action, reason };
  switch (action) {
    case "collect": {
      const rows = facts.latePayers.filter(
        (row) => ids.includes(row.customerId) && seen.customers.has(row.customerId),
      );
      if (rows.length === 0) return "no_late_payer_seen";
      return {
        ...step,
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
      const payNow = (limit?.decisions ?? []).filter(
        (row) => row.decision === "pay" && seen.payablesToPay.has(row.payableId),
      );
      const payLater = collectFirst
        ? (limit?.ifCollected ?? []).filter(
            (row) => row.decision === "pay" && seen.payablesIfCollected.has(row.payableId),
          )
        : [];
      const rows = [...payNow, ...payLater].filter(
        (row, index, all) =>
          ids.includes(row.payableId) &&
          all.findIndex((r) => r.payableId === row.payableId) === index,
      );
      if (rows.length === 0) return "no_payable_bill_seen";
      return {
        ...step,
        ids: rows.map((row) => row.payableId),
        names: rows.map((row) => row.distributor),
        amountPaise: rows.reduce((sum, row) => sum + row.amountPaise, 0),
        label: "supplier_bill",
      };
    }
    case "reorder": {
      const rows = facts.reorder.filter(
        (row) => ids.includes(row.distributorId) && seen.distributors.has(row.distributorId),
      );
      if (rows.length === 0) return "nothing_to_reorder_seen";
      return {
        ...step,
        ids: rows.map((row) => row.distributorId),
        names: rows.map((row) => row.distributor),
        amountPaise: rows.reduce((sum, row) => sum + row.totalPaise, 0),
        label: "supplier_bill",
      };
    }
    case "move_festival_order": {
      const festival = facts.loan.festival;
      if (!festival || !seen.festival) return "no_festival_order_seen";
      return {
        ...step,
        ids: [festival.payableId],
        names: [festival.distributor],
        amountPaise: festival.dueThisWeek ? festival.totalPaise : 0,
        label: "supplier_bill",
      };
    }
    case "check_loan":
      if (!seen.loan) return "loan_not_checked";
      if (facts.loan.loanNeededPaise <= 0) return "no_loan_needed";
      return {
        ...step,
        ids: [],
        names: [],
        amountPaise: facts.loan.loanNeededPaise,
        label: facts.loan.label,
      };
  }
}

/** The plan for the owner's screen: each step with its money and the week after it. */
export function planResponse(
  checked: ReturnType<typeof checkPlan>,
  facts: PlannerFacts,
  run: { id: string; plannedBy: "model" | "rules" },
) {
  const effects = planEffects(
    { gapPaise: facts.week.gapPaise, inHandPaise: facts.week.inHandPaise, label: facts.week.label },
    checked.steps,
  );
  return {
    run_id: run.id,
    planned_by: run.plannedBy,
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
    dropped: checked.dropped,
  };
}

export type PlanResponse = ReturnType<typeof planResponse>;
