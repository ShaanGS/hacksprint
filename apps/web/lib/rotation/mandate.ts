import { overdueDays } from "@/lib/rotation/forecast";
import { addDays } from "@/lib/time";

// The bill-pay agent's rules (decision of Oct 18): inside the owner's mandate, which due bills to
// pay now and why the rest wait. Every amount comes from a supplier bill, the owner's own limit or
// the money in hand; the rules only compare and add them, and never pay part of a bill.

/** A bill due within this many days is paid now; a later one waits for its week. */
const PAY_AHEAD_DAYS = 2;

export type Mandate = { weeklyLimitPaise: number; keepInHandPaise: number };

export type BillDecision = {
  payableId: string;
  distributor: string;
  distributorId: string;
  billNumber: string | null;
  amountPaise: number;
  dueDate: string;
  overdueDays: number;
  decision: "pay" | "hold";
  reason:
    | "within_limit"
    | "over_limit"
    | "not_enough_in_hand"
    | "no_upi_id"
    | "not_due_yet"
    | "festival_order"
    | "no_mandate";
  /** For not_enough_in_hand: how much more money in hand is needed, the floor included; else 0. */
  needsMorePaise: number;
};

type BillPayable = {
  id: string;
  amountPaise: number;
  dueDate: string;
  paid: boolean;
  distributor: string;
  distributorId: string;
  billNumber: string | null;
  kind: "supplier_bill" | "loan_emi";
  festivalOrder: boolean;
};

type DecideInput = {
  payables: BillPayable[];
  /** The shop's date, in India. */
  today: string;
  moneyInHandPaise: number;
  mandate: Mandate | null;
  /** The agent's own payments in the last 7 days already used this much of the limit. */
  paidByAgentLast7DaysPaise: number;
  upiIdOf: (distributorId: string) => string | null;
};

type Verdict = Pick<BillDecision, "decision" | "reason" | "needsMorePaise">;

const hold = (reason: BillDecision["reason"], needsMorePaise = 0): Verdict => ({
  decision: "hold",
  reason,
  needsMorePaise,
});

/** One bill, given what this walk has already chosen to pay. */
function verdictOf(bill: BillPayable, input: DecideInput, decidedPaise: number): Verdict {
  const { mandate } = input;
  if (bill.festivalOrder) return hold("festival_order");
  if (bill.dueDate > addDays(input.today, PAY_AHEAD_DAYS)) return hold("not_due_yet");
  if (!mandate) return hold("no_mandate");
  const limitLeftPaise = mandate.weeklyLimitPaise - input.paidByAgentLast7DaysPaise - decidedPaise;
  if (bill.amountPaise > limitLeftPaise) return hold("over_limit");
  const neededInHandPaise = bill.amountPaise + mandate.keepInHandPaise + decidedPaise;
  if (neededInHandPaise > input.moneyInHandPaise) {
    return hold("not_enough_in_hand", neededInHandPaise - input.moneyInHandPaise);
  }
  if (!input.upiIdOf(bill.distributorId)) return hold("no_upi_id");
  return { decision: "pay", reason: "within_limit", needsMorePaise: 0 };
}

/**
 * Walks the unpaid supplier bills, most overdue first and then by due date, keeping a running
 * total: a bill is paid only when all of it fits in what the weekly limit has left and in the
 * money in hand above the floor, after the bills already chosen in this walk.
 */
export function decideBills(input: DecideInput): {
  decisions: BillDecision[];
  limitLeftPaise: number;
  inHandAfterPaise: number;
} {
  const bills = input.payables
    .filter((p) => !p.paid && p.kind === "supplier_bill")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));

  let decidedPaise = 0;
  const decisions: BillDecision[] = [];
  for (const bill of bills) {
    const verdict = verdictOf(bill, input, decidedPaise);
    if (verdict.decision === "pay") decidedPaise += bill.amountPaise;
    decisions.push({
      payableId: bill.id,
      distributor: bill.distributor,
      distributorId: bill.distributorId,
      billNumber: bill.billNumber,
      amountPaise: bill.amountPaise,
      dueDate: bill.dueDate,
      overdueDays: overdueDays(bill.dueDate, input.today),
      ...verdict,
    });
  }

  const { mandate } = input;
  return {
    decisions,
    limitLeftPaise: mandate
      ? Math.max(0, mandate.weeklyLimitPaise - input.paidByAgentLast7DaysPaise - decidedPaise)
      : 0,
    inHandAfterPaise: input.moneyInHandPaise - decidedPaise,
  };
}
