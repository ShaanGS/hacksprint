import { describe, expect, it } from "vitest";
import { reportSentence } from "@/lib/owner/report";

const day = { orders: 6, collectedPaise: 21400, creditPaise: 9000, owedPaise: 165100 };

describe("nightly report sentence", () => {
  it("says the day's numbers and what is running low", () => {
    expect(reportSentence(day, ["Sugar", "Gold Winner Sunflower Oil"])).toBe(
      "6 orders today. ₹214 collected, ₹90 on account. Sugar and Gold Winner Sunflower Oil are running low.",
    );
  });

  it("handles one order, one low product and none", () => {
    const quiet = { ...day, orders: 1 };
    expect(reportSentence(quiet, ["Sugar"])).toBe(
      "1 order today. ₹214 collected, ₹90 on account. Sugar is running low.",
    );
    expect(reportSentence(quiet, [])).toBe(
      "1 order today. ₹214 collected, ₹90 on account. Nothing is running low.",
    );
  });
});
