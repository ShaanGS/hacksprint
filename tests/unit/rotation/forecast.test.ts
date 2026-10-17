import { describe, expect, it } from "vitest";
import { positionOf } from "@/lib/rotation/credit";
import {
  CLOSE_SHARE,
  dueThisWeek,
  moneyNow,
  stateOf,
  usualWeekSales,
  weekForecast,
  weeklyCosts,
} from "@/lib/rotation/forecast";
import { addDays } from "@/lib/time";
import {
  at,
  costs,
  customers,
  dayCloses,
  daysAgo,
  NOW,
  payables,
  payments,
  TODAY,
} from "./fixture";

const positions = customers.map((c) => positionOf(c, TODAY)).filter((p) => p !== null);
const input = { payables, costs, dayCloses, payments, positions, now: NOW };

describe("money needed (9.7)", () => {
  it("counts bills due within 7 days, overdue ones included", () => {
    expect(dueThisWeek(payables, TODAY)).toEqual({
      paise: 8_400_000,
      overduePaise: 2_150_000,
      bills: 3,
      label: "supplier_bill",
    });
  });

  it("still counts a bill overdue by 10 days", () => {
    const old = [{ ...payables[1], dueDate: addDays(TODAY, -10) }];
    expect(dueThisWeek(old, TODAY).overduePaise).toBe(2_150_000);
  });

  it("spreads a monthly cost over the year's weeks", () => {
    expect(weeklyCosts(costs).paise).toBe(1_150_000);
  });
});

describe("money likely (9.7)", () => {
  it("takes the money in hand said last night", () => {
    expect(moneyNow(dayCloses, payments, payables, NOW)).toMatchObject({
      paise: 720_000,
      missing: false,
      verifiedAfterPaise: 0,
      paidOutAfterPaise: 0,
    });
  });

  it("adds verified payments that came after it", () => {
    const later = [
      ...payments,
      { paidAt: at(TODAY, "12:00"), amountPaise: 420_000, isCreditRepayment: true },
    ];
    expect(moneyNow(dayCloses, later, payables, NOW)).toMatchObject({
      paise: 1_140_000,
      verifiedAfterPaise: 420_000,
    });
  });

  it("takes off bills paid after it, and not the ones paid before", () => {
    const collected = [
      ...payments,
      { paidAt: at(TODAY, "11:00"), amountPaise: 960_000, isCreditRepayment: true },
    ];
    const paidToday = payables.map((p) =>
      p.id === "murugan" ? { ...p, paid: true, paidAt: at(TODAY, "14:00") } : p,
    );
    expect(moneyNow(dayCloses, collected, paidToday, NOW)).toMatchObject({
      paise: 280_000,
      verifiedAfterPaise: 960_000,
      paidOutAfterPaise: 1_400_000,
    });
  });

  it("leaves out money in hand older than 2 days and asks for it", () => {
    const old = dayCloses.filter((d) => d.businessDate < daysAgo(2));
    expect(moneyNow(old, payments, payables, NOW)).toMatchObject({ paise: 0, missing: true });
    expect(weekForecast({ ...input, dayCloses: old }).asks).toContain("money_in_hand");
  });

  it("makes a usual week from cash said plus verified sales, on days with a cash entry", () => {
    expect(usualWeekSales(dayCloses, payments, TODAY)).toMatchObject({
      paise: 4_900_000,
      dailyPaise: 700_000,
      daysUsed: 27,
      enough: true,
    });
  });

  it("leaves repayments out of sales", () => {
    const repaid = [
      ...payments,
      { paidAt: at(daysAgo(3), "12:00"), amountPaise: 999_900, isCreditRepayment: true },
    ];
    expect(usualWeekSales(dayCloses, repaid, TODAY).dailyPaise).toBe(700_000);
  });

  it("has not enough data without day-close entries, and asks for tonight's cash sales", () => {
    expect(usualWeekSales([], payments, TODAY)).toMatchObject({
      paise: 0,
      enough: false,
      daysUsed: 0,
    });
    const forecast = weekForecast({ ...input, dayCloses: [] });
    expect(forecast.asks).toEqual(["money_in_hand", "cash_sales"]);
  });
});

describe("the week's state", () => {
  it("is short below zero, close under 10% of the need, ok above", () => {
    expect(CLOSE_SHARE).toBe(0.1);
    expect(stateOf(-1, 1000)).toBe("short");
    expect(stateOf(0, 1000)).toBe("close");
    expect(stateOf(99, 1000)).toBe("close");
    expect(stateOf(100, 1000)).toBe("ok");
  });

  it("finds the demo week short by ₹36,500, with late payers apart", () => {
    const week = weekForecast(input);
    expect(week.needed.paise).toBe(9_550_000);
    expect(week.likely.paise).toBe(5_900_000);
    expect(week.gapPaise).toBe(-3_650_000);
    expect(week.state).toBe("short");
    expect(week.late.paise).toBe(960_000);
    expect(week.asks).toEqual([]);
  });

  it("keeps the gap as it was when a bill is paid after the night's figure", () => {
    const paidToday = payables.map((p) =>
      p.id === "murugan" ? { ...p, paid: true, paidAt: at(TODAY, "14:00") } : p,
    );
    const week = weekForecast({ ...input, payables: paidToday });
    expect(week.needed.paise).toBe(8_150_000);
    expect(week.likely.paise).toBe(4_500_000);
    expect(week.gapPaise).toBe(-3_650_000);
  });

  it("finds a normal week, without the festival bill, ok with ₹12,000 spare", () => {
    const week = weekForecast({ ...input, leaveOut: new Set(["deepavali"]) });
    expect(week.gapPaise).toBe(1_200_000);
    expect(week.state).toBe("ok");
  });
});
