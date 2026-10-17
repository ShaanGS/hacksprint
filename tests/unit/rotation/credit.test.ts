import { describe, expect, it } from "vitest";
import {
  collectOrder,
  lateTotal,
  likelyFromCustomers,
  positionOf,
  settle,
  usualRepayDays,
  withCustomers,
  type LedgerEntry,
} from "@/lib/rotation/credit";
import { at, customers, daysAgo, ledger, TODAY } from "./fixture";

const positions = customers.map((c) => positionOf(c, TODAY)).filter((p) => p !== null);

describe("settling credit oldest first (9.6)", () => {
  it("pays off the oldest credit first, across partial repayments", () => {
    const entries: LedgerEntry[] = [
      { at: at(daysAgo(20), "10:00"), amountPaise: 10_000, source: "owner_said" },
      { at: at(daysAgo(15), "10:00"), amountPaise: 5_000, source: "owner_said" },
      { at: at(daysAgo(12), "10:00"), amountPaise: -6_000, source: "owner_said" },
      { at: at(daysAgo(10), "10:00"), amountPaise: -6_000, source: "verified_payment" },
    ];
    const { settled, open } = settle(entries);
    expect(settled).toEqual([
      { creditPaise: 10_000, days: 10, repaidAt: entries[3].at, viaLink: true },
    ]);
    expect(open).toEqual([{ at: entries[1].at, remainingPaise: 3_000 }]);
  });

  it("knows no pattern with fewer than two settled credits", () => {
    expect(usualRepayDays([])).toBeNull();
    expect(usualRepayDays([{ creditPaise: 1, days: 8, repaidAt: "", viaLink: false }])).toBeNull();
  });

  it("takes the median days", () => {
    const days = (list: number[]) =>
      list.map((d) => ({ creditPaise: 1, days: d, repaidAt: "", viaLink: false }));
    expect(usualRepayDays(days([13, 11, 12]))).toBe(12);
    expect(usualRepayDays(days([11, 12]))).toBe(11.5);
  });
});

describe("where each customer stands", () => {
  it("calls a customer late against their own habit", () => {
    const arjun = positions.find((p) => p.customerId === "arjun");
    expect(arjun?.status).toEqual({ kind: "late", usualDays: 12, daysLate: 9 });
    expect(arjun?.balancePaise).toBe(420_000);
  });

  it("does not call a customer late on exactly their usual day; they count as due", () => {
    const exact = ledger("x", "Exact", [
      [30, 100, 7],
      [20, 100, 7],
      [7, 500, null],
    ]);
    expect(positionOf(exact, TODAY)?.status).toEqual({ kind: "due", usualDays: 7, dueInDays: 0 });
  });

  it("has no pattern for a customer with fewer than two settled credits", () => {
    expect(positions.find((p) => p.customerId === "imran")?.status).toEqual({
      kind: "unknown",
      settled: 1,
    });
    expect(positions.find((p) => p.customerId === "divya")?.status).toEqual({
      kind: "unknown",
      settled: 0,
    });
  });

  it("leaves out a customer who owes nothing", () => {
    expect(positions.find((p) => p.customerId === "ramesh")).toBeUndefined();
  });
});

describe("the collect list (9.8)", () => {
  it("puts late payers first, most days late first, then no pattern by amount, then the rest", () => {
    expect(collectOrder(positions).map((p) => p.customerId)).toEqual([
      "arjun",
      "meena",
      "rahul",
      "imran",
      "divya",
      "priya",
      "karthik",
      "lakshmi",
    ]);
  });
});

describe("credit in the week (9.4, 9.7)", () => {
  it("adds up what customers owe, what is likely this week and what late payers owe", () => {
    expect(withCustomers(positions).paise).toBe(1_450_000);
    expect(likelyFromCustomers(positions)).toEqual({
      paise: 280_000,
      label: "owner_said",
      customers: 2,
    });
    expect(lateTotal(positions)).toEqual({ paise: 960_000, label: "owner_said", customers: 3 });
  });
});
