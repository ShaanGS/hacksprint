import type { FunctionDeclaration } from "@google/genai";
import type { PlannerFacts } from "@/lib/planner/facts";
import { cleanText } from "@/lib/planner/guardrails";
import { planActions, type PlanAction } from "@/lib/rotation/plan-effects";

// The planner's tools. Each answers from the run's facts in a few hundred tokens at most:
// amounts in whole paise with their source labels, ids to refer back to, at most five rows.
// What a tool showed is remembered, so the plan can only point at things the model has seen.
// Customers go out as ids and amounts only: the model needs no name to plan, and code puts the
// names back on the owner's screen. Names and bill numbers that came from outside (a bill
// photo, the owner's words) go through cleanText, so none can carry a line of instructions.

const MAX_ROWS = 5;
const NAME_CHARS = 60;
const text = (value: string) => cleanText(value, NAME_CHARS);

export const planReasons = [
  "late_payers_first",
  "within_your_limit",
  "bill_due_soon",
  "runs_out_soon",
  "festival_needs_money",
  "cheaper_than_app_loans",
  "close_the_gap",
] as const;

const noArgs = { type: "object", properties: {} };

const readTools: FunctionDeclaration[] = [
  {
    name: "look_at_week",
    description: "This week's money: needed against likely, the gap, money in hand, late money.",
    parametersJsonSchema: noArgs,
  },
  {
    name: "list_late_payers",
    description: "Customers past their own usual repayment days, most worth collecting first.",
    parametersJsonSchema: noArgs,
  },
  {
    name: "list_bills_due",
    description:
      "Supplier bills due in the next 7 days or overdue, soonest first. This shows what is due, not what may be paid: check_bill_limit says that.",
    parametersJsonSchema: noArgs,
  },
  {
    name: "check_stock",
    description: "Items running out within a week, and the reorder each distributor would get.",
    parametersJsonSchema: noArgs,
  },
  {
    name: "check_loan",
    description:
      "The festival order and whether the week needs a loan for it after collecting: the loan size and its Mudra band.",
    parametersJsonSchema: noArgs,
  },
  {
    name: "check_bill_limit",
    description:
      "The owner's weekly limit for bills the agent may pay: the bills it can pay now, the bills it could pay once the late payers pay, and the bills on hold with the reason.",
    parametersJsonSchema: noArgs,
  },
];

const finishPlan = (actions: readonly PlanAction[]): FunctionDeclaration => ({
  name: "finish_plan",
  description:
    "The plan, in the order the owner should do it. Use only ids that a tool returned. Never write amounts: code works them out.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        // A week with nothing to act on can only finish with no steps.
        maxItems: actions.length > 0 ? 5 : 0,
        items: {
          type: "object",
          properties: {
            // The schema needs one allowed value even when no step may be planned.
            action: { type: "string", enum: actions.length > 0 ? [...actions] : [...planActions] },
            ids: {
              type: "array",
              items: { type: "string" },
              description:
                "collect: customer ids; pay_bills: payable ids; reorder: distributor ids; move_festival_order: its payable id; check_loan: none",
            },
            reason: { type: "string", enum: [...planReasons] },
          },
          required: ["action", "reason"],
        },
      },
    },
    required: ["steps"],
  },
});

/**
 * The actions this week gives something to act on. An action with nothing behind it (paying when
 * no bill fits the owner's limit, collecting when nobody is late) is not offered to the model at
 * all; checkPlan still stands behind this.
 */
export function actionsFor(facts: PlannerFacts): PlanAction[] {
  const limit = facts.billLimit;
  const late = facts.latePayers.length > 0;
  const open: Record<PlanAction, boolean> = {
    collect: late,
    pay_bills:
      (limit?.decisions ?? []).some((row) => row.decision === "pay") ||
      (late && (limit?.ifCollected ?? []).some((row) => row.decision === "pay")),
    reorder: facts.reorder.length > 0,
    move_festival_order: facts.loan.festival !== null,
    check_loan: facts.loan.loanNeededPaise > 0,
  };
  return planActions.filter((action) => open[action]);
}

/** The read tools, and finish_plan offering only this week's actions. */
export function plannerToolsFor(facts: PlannerFacts): FunctionDeclaration[] {
  return [...readTools, finishPlan(actionsFor(facts))];
}

/** The ids each tool has shown the model in this run. */
export type Seen = {
  customers: Set<string>;
  payablesToPay: Set<string>;
  /** Bills that become payable once the late payers pay. */
  payablesIfCollected: Set<string>;
  distributors: Set<string>;
  festival: boolean;
  loan: boolean;
};

export function nothingSeen(): Seen {
  return {
    customers: new Set(),
    payablesToPay: new Set(),
    payablesIfCollected: new Set(),
    distributors: new Set(),
    festival: false,
    loan: false,
  };
}

/** Runs one read tool; an unknown name comes back to the model as an error, not a throw. */
export function runPlannerTool(
  facts: PlannerFacts,
  seen: Seen,
  name: string,
): Record<string, unknown> {
  const { week } = facts;
  switch (name) {
    case "look_at_week":
      return {
        as_of: facts.asOf,
        state: week.state,
        gap_paise: week.gapPaise,
        needed_paise: week.neededPaise,
        likely_paise: week.likelyPaise,
        money_in_hand_paise: week.inHandPaise,
        late_paise: week.latePaise,
        label: week.label,
      };
    case "list_late_payers": {
      const rows = facts.latePayers.slice(0, MAX_ROWS);
      rows.forEach((row) => seen.customers.add(row.customerId));
      return {
        customers: rows.map((row) => ({
          id: row.customerId,
          owes_paise: row.owesPaise,
          usual_days: row.usualDays,
          days_late: row.daysLate,
          label: row.label,
        })),
        more: Math.max(0, facts.latePayers.length - MAX_ROWS),
      };
    }
    case "list_bills_due":
      // No ids here. Only the tool that allows an action hands out ids for it, so a bill can
      // reach the plan only through check_bill_limit, which applies the owner's own limit.
      return {
        bills: facts.bills.slice(0, MAX_ROWS).map((bill) => ({
          distributor: text(bill.distributor),
          bill_number: bill.billNumber === null ? null : text(bill.billNumber),
          amount_paise: bill.amountPaise,
          due_in_days: bill.dueInDays,
          overdue_days: bill.overdueDays,
          festival_order: bill.festivalOrder,
          label: "supplier_bill",
        })),
      };
    case "check_stock": {
      const groups = facts.reorder.slice(0, MAX_ROWS);
      groups.forEach((group) => seen.distributors.add(group.distributorId));
      return {
        running_out: facts.low.slice(0, MAX_ROWS).map((item) => ({
          name: text(item.name),
          days_left: item.daysLeft,
          label: "estimate",
        })),
        reorder: groups.map((group) => ({
          distributor_id: group.distributorId,
          distributor: text(group.distributor),
          total_paise: group.totalPaise,
          lines: group.lines,
          label: "supplier_bill",
        })),
      };
    }
    case "check_loan": {
      seen.loan = true;
      seen.festival = facts.loan.festival !== null;
      const festival = facts.loan.festival;
      return {
        festival_order: festival
          ? {
              id: festival.payableId,
              festival: text(festival.festival),
              distributor: text(festival.distributor),
              total_paise: festival.totalPaise,
              due_this_week: festival.dueThisWeek,
            }
          : null,
        gap_without_order_paise: facts.loan.gapWithoutOrderPaise,
        can_collect_paise: facts.loan.canCollectPaise,
        loan_needed_paise: facts.loan.loanNeededPaise,
        mudra_band: facts.loan.band,
        label: facts.loan.label,
      };
    }
    case "check_bill_limit": {
      const limit = facts.billLimit;
      if (!limit) return { mandate: null, can_pay_now: [], on_hold: [] };
      const now = limit.decisions.slice(0, MAX_ROWS);
      // With nobody late, collecting changes nothing, so that view is left out.
      const later = facts.latePayers.length > 0 ? limit.ifCollected.slice(0, MAX_ROWS) : [];
      const payNow = now.filter((r) => r.decision === "pay");
      const payLater = later.filter(
        (r) => r.decision === "pay" && !payNow.some((p) => p.payableId === r.payableId),
      );
      payNow.forEach((r) => seen.payablesToPay.add(r.payableId));
      payLater.forEach((r) => seen.payablesIfCollected.add(r.payableId));
      const payable = (r: (typeof now)[number]) => ({
        payable_id: r.payableId,
        distributor: text(r.distributor),
        amount_paise: r.amountPaise,
      });
      return {
        mandate: limit.mandate
          ? {
              weekly_limit_paise: limit.mandate.weeklyLimitPaise,
              keep_in_hand_paise: limit.mandate.keepInHandPaise,
              label: "owner_said",
            }
          : null,
        limit_left_paise: limit.limitLeftPaise,
        can_pay_now: payNow.map(payable),
        ...(payLater.length > 0 && { can_pay_after_collecting: payLater.map(payable) }),
        // Held bills carry no id: a plan cannot point at a bill the owner's own rules hold.
        on_hold: now
          .filter(
            (r) => r.decision === "hold" && !payLater.some((p) => p.payableId === r.payableId),
          )
          .map((r) => ({
            distributor: text(r.distributor),
            amount_paise: r.amountPaise,
            reason: r.reason,
            needs_more_paise: r.needsMorePaise,
          })),
      };
    }
    default:
      return { error: `No tool called ${name}.` };
  }
}
