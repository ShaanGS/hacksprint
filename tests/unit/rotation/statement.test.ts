import { describe, expect, it } from "vitest";
import { moneyCycleDays } from "@/lib/rotation/cycle";
import { weakest } from "@/lib/rotation/labels";
import { statementBlocks } from "@/lib/rotation/statement";
import { lateCreditRecovered } from "@/lib/rotation/value";
import { lastFullMonths } from "@/lib/time";
import { at, customers, dayCloses, payments, TODAY } from "./fixture";

describe("labels", () => {
  it("gives a total the label of its weakest input", () => {
    expect(weakest("verified_payment", "supplier_bill")).toBe("supplier_bill");
    expect(weakest("verified_payment", "owner_said", "estimate")).toBe("owner_said");
    expect(weakest("supplier_bill", "estimate")).toBe("estimate");
  });
});

describe("money cycle days (9.12)", () => {
  it("is stock days plus customer days minus supplier days, and what a day frees", () => {
    const cycle = moneyCycleDays({
      onShelfPaise: 14_000_000,
      withCustomersPaise: 1_400_000,
      owedToSuppliersPaise: 5_600_000,
      purchasesPaise: 16_800_000,
      dailySalesPaise: 700_000,
    });
    expect(cycle?.stockDays).toBe(23.333333333333332);
    expect(cycle?.customerDays).toBe(2);
    expect(cycle?.supplierDays).toBeCloseTo(9.333, 3);
    expect(cycle?.days).toBeCloseTo(16, 5);
    expect(cycle?.freedPerDayPaise).toBe(600_000);
  });

  it("is unknown with zero sales or no purchases", () => {
    const base = {
      onShelfPaise: 1,
      withCustomersPaise: 1,
      owedToSuppliersPaise: 1,
      purchasesPaise: 2_800,
      dailySalesPaise: 0,
    };
    expect(moneyCycleDays(base)).toBeNull();
    expect(moneyCycleDays({ ...base, dailySalesPaise: 100, purchasesPaise: 0 })).toBeNull();
  });
});

describe("late credit recovered (9.15)", () => {
  it("counts settlements slower than the customer's usual, last 30 days, verified apart", () => {
    expect(lateCreditRecovered(customers, TODAY)).toEqual({
      verifiedPaise: 620_000,
      declaredPaise: 40_000,
    });
  });
});

describe("the statement (9.13)", () => {
  const months = lastFullMonths(TODAY, 3);
  const blocks = statementBlocks({
    months,
    payments,
    dayCloses,
    customers,
    bills: [
      { billedOn: "2026-09-02", totalPaise: 2_150_000 },
      { billedOn: "2026-09-09", totalPaise: 1_400_000 },
    ],
    payables: [
      { dueDate: "2026-09-17", paidAt: at("2026-09-17", "11:00"), paidVia: "bank" },
      { dueDate: "2026-09-16", paidAt: at("2026-09-19", "18:00"), paidVia: "cash" },
    ],
    stockValueByMonth: [14_000_000, 15_000_000, 16_000_000],
    moneyCycleDays: 12.4,
  });

  it("covers the last 3 full months", () => {
    expect(months).toEqual(["2026-07", "2026-08", "2026-09"]);
  });

  it("keeps verified and declared apart, each with its label", () => {
    expect(Object.keys(blocks.verified)).toEqual([
      "digitalPayments",
      "creditRecoveredByLink",
      "supplierBills",
    ]);
    expect(blocks.verified.supplierBills).toMatchObject({
      label: "supplier_bill",
      count: [0, 0, 2],
    });
    expect(blocks.declared.cashSales.label).toBe("owner_said");
    expect(blocks.declared.averageStockValue).toEqual({ label: "estimate", paise: 15_000_000 });
  });

  it("calls bills paid on time the owner's word unless the payment was verified", () => {
    expect(blocks.declared.billsPaidOnTime).toEqual({ label: "owner_said", percent: 50, bills: 2 });
  });

  it("reports repayments by link with the median days those customers took", () => {
    expect(blocks.verified.creditRecoveredByLink.byMonth[1]).toBe(210_000 + 140_000);
    // Link settlements took 6, 7, 8, 10 and 13 days.
    expect(blocks.verified.creditRecoveredByLink.medianDays).toBe(8);
  });
});
