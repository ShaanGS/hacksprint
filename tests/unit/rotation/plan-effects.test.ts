import { describe, expect, it } from "vitest";
import { planEffects } from "@/lib/rotation/plan-effects";

// The demo week: short by ₹36,500 with ₹7,200 in hand; three late payers owe ₹9,600; Murugan
// Traders' ₹14,000 bill is due; the loan check asks for ₹27,000.
const start = { gapPaise: -3_650_000, inHandPaise: 720_000, label: "supplier_bill" as const };

describe("planEffects", () => {
  it("walks the demo plan: collect, pay a bill, then the loan closes the week", () => {
    const effects = planEffects(start, [
      { action: "collect", amountPaise: 960_000, label: "owner_said" },
      { action: "pay_bills", amountPaise: 1_400_000, label: "supplier_bill" },
      { action: "check_loan", amountPaise: 2_700_000, label: "estimate" },
    ]);
    expect(effects.map((e) => [e.gapAfterPaise, e.inHandAfterPaise])).toEqual([
      [-2_690_000, 1_680_000],
      [-2_690_000, 280_000],
      [10_000, 2_980_000],
    ]);
  });

  it("leaves the gap alone when bills are paid, since they were already in the week", () => {
    const [paid] = planEffects(start, [
      { action: "pay_bills", amountPaise: 1_400_000, label: "supplier_bill" },
    ]);
    expect(paid.gapAfterPaise).toBe(start.gapPaise);
    expect(paid.inHandAfterPaise).toBe(720_000 - 1_400_000);
  });

  it("moves nothing this week for a reorder on the distributor's credit", () => {
    const [reorder] = planEffects(start, [
      { action: "reorder", amountPaise: 73_200, label: "supplier_bill" },
    ]);
    expect(reorder.gapAfterPaise).toBe(start.gapPaise);
    expect(reorder.inHandAfterPaise).toBe(start.inHandPaise);
  });

  it("takes the festival order's bill out of this week when it is moved", () => {
    const [moved] = planEffects(start, [
      { action: "move_festival_order", amountPaise: 4_850_000, label: "supplier_bill" },
    ]);
    expect(moved.gapAfterPaise).toBe(1_200_000);
    expect(moved.inHandAfterPaise).toBe(start.inHandPaise);
  });

  it("carries the weakest label forward, as any total does", () => {
    const labels = planEffects(start, [
      { action: "collect", amountPaise: 960_000, label: "owner_said" },
      { action: "pay_bills", amountPaise: 100, label: "supplier_bill" },
    ]).map((e) => e.label);
    expect(labels).toEqual(["owner_said", "owner_said"]);
  });

  it("returns nothing for an empty plan", () => {
    expect(planEffects(start, [])).toEqual([]);
  });
});
