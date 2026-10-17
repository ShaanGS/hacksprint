import { describe, expect, it } from "vitest";
import { decideBills } from "@/lib/rotation/mandate";
import { addDays } from "@/lib/time";
import { payables, TODAY } from "./fixture";

// The demo shop's bills (fixture.ts) as the bill-pay agent reads them: Sri Balaji's overdue SB-2070,
// Murugan's MT-140 due in 2 days, the Deepavali bill DV-1 and Sri Balaji's later SB-2072.

const bills = payables.map((p) => ({
  ...p,
  distributorId: p.distributor === "Murugan Traders" ? "murugan" : "balaji",
  kind: "supplier_bill" as const,
  festivalOrder: p.purchaseOrderId !== null,
}));

const upi = (distributorId: string) => `${distributorId}.demo@example`;
const demoMandate = { weeklyLimitPaise: 2_500_000, keepInHandPaise: 200_000 };

const base = {
  payables: bills,
  today: TODAY,
  moneyInHandPaise: 1_680_000,
  mandate: demoMandate,
  paidByAgentLast7DaysPaise: 0,
  upiIdOf: upi,
};

const outcome = (result: ReturnType<typeof decideBills>) =>
  result.decisions.map((d) => [d.billNumber, d.decision, d.reason, d.needsMorePaise]);

describe("the bill-pay agent's rules", () => {
  it("pays Murugan and holds the rest in the demo week", () => {
    const result = decideBills(base);
    expect(outcome(result)).toEqual([
      ["SB-2070", "hold", "not_enough_in_hand", 670_000],
      ["MT-140", "pay", "within_limit", 0],
      ["DV-1", "hold", "festival_order", 0],
      ["SB-2072", "hold", "not_due_yet", 0],
    ]);
    expect(result.inHandAfterPaise).toBe(280_000);
    expect(result.limitLeftPaise).toBe(1_100_000);
    expect(result.decisions[0]).toMatchObject({
      payableId: "overdue",
      distributorId: "balaji",
      amountPaise: 2_150_000,
      overdueDays: 3,
    });
  });

  it("holds a bill bigger than what the weekly limit has left", () => {
    const result = decideBills({
      ...base,
      moneyInHandPaise: 5_000_000,
      mandate: { weeklyLimitPaise: 1_000_000, keepInHandPaise: 200_000 },
    });
    expect(outcome(result).slice(0, 2)).toEqual([
      ["SB-2070", "hold", "over_limit", 0],
      ["MT-140", "hold", "over_limit", 0],
    ]);
    expect(result.limitLeftPaise).toBe(1_000_000);
    expect(result.inHandAfterPaise).toBe(5_000_000);
  });

  it("counts what the agent already paid this week against the limit", () => {
    const rich = { ...base, moneyInHandPaise: 5_000_000 };
    expect(outcome(decideBills(rich)).slice(0, 2)).toEqual([
      ["SB-2070", "pay", "within_limit", 0],
      ["MT-140", "hold", "over_limit", 0],
    ]);
    const paidBefore = decideBills({ ...rich, paidByAgentLast7DaysPaise: 1_000_000 });
    expect(outcome(paidBefore).slice(0, 2)).toEqual([
      ["SB-2070", "hold", "over_limit", 0],
      ["MT-140", "pay", "within_limit", 0],
    ]);
    expect(paidBefore.limitLeftPaise).toBe(100_000);
  });

  it("counts bills already chosen in the walk against the money in hand", () => {
    const result = decideBills({
      ...base,
      moneyInHandPaise: 3_000_000,
      mandate: { weeklyLimitPaise: 5_000_000, keepInHandPaise: 200_000 },
    });
    expect(outcome(result).slice(0, 2)).toEqual([
      ["SB-2070", "pay", "within_limit", 0],
      ["MT-140", "hold", "not_enough_in_hand", 750_000],
    ]);
    expect(result.inHandAfterPaise).toBe(850_000);
  });

  it("holds a bill whose distributor has no UPI id, and keeps its money free", () => {
    const result = decideBills({
      ...base,
      upiIdOf: (id) => (id === "murugan" ? null : upi(id)),
    });
    expect(outcome(result)[1]).toEqual(["MT-140", "hold", "no_upi_id", 0]);
    expect(result.inHandAfterPaise).toBe(1_680_000);
    expect(result.limitLeftPaise).toBe(2_500_000);
  });

  it("pays nothing without a mandate", () => {
    const result = decideBills({ ...base, mandate: null });
    expect(outcome(result)).toEqual([
      ["SB-2070", "hold", "no_mandate", 0],
      ["MT-140", "hold", "no_mandate", 0],
      ["DV-1", "hold", "festival_order", 0],
      ["SB-2072", "hold", "not_due_yet", 0],
    ]);
    expect(result.limitLeftPaise).toBe(0);
    expect(result.inHandAfterPaise).toBe(1_680_000);
  });

  it("leaves out loan EMIs and paid bills", () => {
    const emi = {
      ...bills[2],
      id: "emi",
      billNumber: null,
      dueDate: TODAY,
      kind: "loan_emi" as const,
    };
    const result = decideBills({ ...base, payables: [...bills, emi] });
    const ids = result.decisions.map((d) => d.payableId);
    expect(ids).not.toContain("emi");
    expect(ids).not.toContain("paid");
    expect(ids).toHaveLength(4);
  });

  it("pays a bill due in 2 days and waits on one due in 3", () => {
    const dueIn = (days: number) => [{ ...bills[2], dueDate: addDays(TODAY, days) }];
    expect(decideBills({ ...base, payables: dueIn(2) }).decisions[0].decision).toBe("pay");
    expect(decideBills({ ...base, payables: dueIn(3) }).decisions[0].reason).toBe("not_due_yet");
  });
});
