import { describe, expect, it } from "vitest";
import { answerText, type AnswerFacts } from "@/lib/owner-voice/answers";
import type { Question } from "@/lib/owner-voice/types";
import { positionOf, type CustomerPosition } from "@/lib/rotation/credit";
import { customers, TODAY } from "./fixture";

const positions = customers
  .map((customer) => positionOf(customer, TODAY))
  .filter((position): position is CustomerPosition => position !== null);

const facts: AnswerFacts = {
  week: {
    state: "short",
    gapPaise: -3_650_000,
    neededPaise: 9_550_000,
    likelyPaise: 5_900_000,
    latePaise: 960_000,
    lateCustomers: 3,
  },
  positions,
  customerName: null,
  onShelfPaise: 11_456_000,
  stuckPaise: 4_610_500,
  low: [],
  dues: [
    {
      distributor: "Sri Balaji Agencies",
      amountPaise: 2_150_000,
      dueDate: "2026-10-15",
      overdueDays: 3,
    },
    {
      distributor: "Murugan Traders",
      amountPaise: 1_400_000,
      dueDate: "2026-10-20",
      overdueDays: 0,
    },
  ],
  loan: null,
  items: [
    { name: "Tomato", qty: 2, linePaise: 6_000 },
    { name: "Ponni Raw Rice", qty: 3, linePaise: 18_600 },
  ],
};

const ask = (topic: Question["topic"], customerId: string | null = null): Question => ({
  kind: "question",
  topic,
  customerId,
  items: [],
  missing: [],
});

describe("answers to spoken questions", () => {
  it("says whether the week is short, with the numbers from the forecast", () => {
    expect(answerText(ask("week"), facts, "en")).toBe(
      "This week you are short by ₹36,500. Your bills need ₹95,500 and about ₹59,000 is likely to come in. Collecting from 3 late payers would bring ₹9,600.",
    );
  });

  it("names the late payers in collect order", () => {
    expect(answerText(ask("collect"), facts, "en")).toMatch(/^3 customers are late: Arjun/);
  });

  it("says a customer owes nothing rather than guessing", () => {
    expect(answerText(ask("customer", "nobody"), { ...facts, customerName: "Ramesh" }, "en")).toBe(
      "Ramesh owes nothing.",
    );
  });

  it("adds up a spoken list at the shop's prices", () => {
    expect(answerText(ask("items"), facts, "en")).toBe(
      "That comes to ₹246: Tomato × 2 ₹60, Ponni Raw Rice × 3 ₹186.",
    );
  });

  it("puts what is overdue before what is due next, in Tamil too", () => {
    expect(answerText(ask("dues"), facts, "ta")).toContain("கெடு தாண்டி 3 நாள்");
  });

  it("says which items the shop does not sell instead of not understanding", () => {
    const snakeGourd = { ...ask("items"), missing: ["புடலங்காய்"] };
    expect(answerText(snakeGourd, { ...facts, items: [] }, "ta")).toBe(
      "உங்கள் கடைப் பட்டியலில் இல்லை: புடலங்காய்.",
    );
  });
});
