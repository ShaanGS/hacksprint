import { weakest, type SourceLabel } from "@/lib/rotation/labels";

// What each step of the agent's plan does to this week, worked out here and never by the model
// (rule 1). Steps apply in order, so each starts from where the one before left the week.

export const planActions = [
  "collect",
  "pay_bills",
  "reorder",
  "move_festival_order",
  "check_loan",
] as const;
export type PlanAction = (typeof planActions)[number];

/** A step and the money it moves: what the late payers owe, the bills paid, the loan. */
export type PlannedStep = { action: PlanAction; amountPaise: number; label: SourceLabel };

export type StepEffect = PlannedStep & { gapAfterPaise: number; inHandAfterPaise: number };

/**
 * Collecting brings late money in, so the gap and money in hand both rise. Paying bills moves
 * money in hand to the distributor but leaves the gap alone, since those bills were already in
 * the week. A reorder goes on the distributor's credit, so nothing moves this week. Moving the
 * festival order takes its bill out of this week. A loan brings its amount in. Each step's
 * label is the weakest of everything it builds on, as for any total (spec 9.13).
 */
export function planEffects(
  start: { gapPaise: number; inHandPaise: number; label: SourceLabel },
  steps: PlannedStep[],
): StepEffect[] {
  let gap = start.gapPaise;
  let inHand = start.inHandPaise;
  let label = start.label;
  return steps.map((step) => {
    if (step.action === "collect" || step.action === "check_loan") {
      gap += step.amountPaise;
      inHand += step.amountPaise;
    }
    if (step.action === "pay_bills") inHand -= step.amountPaise;
    if (step.action === "move_festival_order") gap += step.amountPaise;
    label = weakest(label, step.label);
    return { ...step, label, gapAfterPaise: gap, inHandAfterPaise: inHand };
  });
}
