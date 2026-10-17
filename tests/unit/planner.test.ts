import type { Content } from "@google/genai";
import { describe, expect, it } from "vitest";
import type { PlannerFacts } from "@/lib/planner/facts";
import { rulesPlan, seenAll } from "@/lib/planner/fallback";
import { checkPlan, planResponse } from "@/lib/planner/plan";
import { runPlanner, type Generate } from "@/lib/planner/run";
import { nothingSeen, runPlannerTool } from "@/lib/planner/tools";

// The demo week in planner facts: short by ₹36,500 with ₹7,200 in hand, three late payers,
// Murugan Traders' bill payable inside the owner's limit, and a ₹27,000 loan for the festival.
const facts: PlannerFacts = {
  asOf: "2026-10-18T15:00:00+05:30",
  today: "2026-10-18",
  week: {
    state: "short",
    gapPaise: -3_650_000,
    neededPaise: 9_550_000,
    likelyPaise: 5_900_000,
    inHandPaise: 720_000,
    latePaise: 960_000,
    label: "owner_said",
  },
  latePayers: [
    {
      customerId: "c1",
      name: "Arjun Reddy",
      owesPaise: 420_000,
      usualDays: 12,
      daysLate: 9,
      label: "owner_said",
    },
    {
      customerId: "c2",
      name: "Meena Krishnan",
      owesPaise: 300_000,
      usualDays: 7,
      daysLate: 8,
      label: "owner_said",
    },
    {
      customerId: "c3",
      name: "Rahul Sharma",
      owesPaise: 240_000,
      usualDays: 5,
      daysLate: 4,
      label: "owner_said",
    },
  ],
  bills: [],
  low: [],
  reorder: [{ distributorId: "d1", distributor: "Murugan Traders", totalPaise: 73_200, lines: 1 }],
  loan: {
    festival: {
      payableId: "p-dv1",
      festival: "Deepavali",
      distributor: "Sri Balaji Agencies",
      totalPaise: 4_850_000,
      dueThisWeek: true,
    },
    gapWithoutOrderPaise: 1_200_000,
    canCollectPaise: 960_000,
    loanNeededPaise: 2_700_000,
    band: "shishu",
    label: "estimate",
  },
  billLimit: {
    mandate: { weeklyLimitPaise: 2_500_000, keepInHandPaise: 200_000 },
    limitLeftPaise: 2_500_000,
    decisions: [
      {
        payableId: "p-mt140",
        distributor: "Murugan Traders",
        amountPaise: 1_400_000,
        decision: "pay",
        reason: "within_limit",
        needsMorePaise: 0,
      },
      {
        payableId: "p-sb2070",
        distributor: "Sri Balaji Agencies",
        amountPaise: 2_150_000,
        decision: "hold",
        reason: "not_enough_in_hand",
        needsMorePaise: 670_000,
      },
    ],
  },
  lastPlan: null,
};

describe("checkPlan", () => {
  it("keeps only ids a tool showed, and takes the amounts from the facts", () => {
    const seen = nothingSeen();
    runPlannerTool(facts, seen, "list_late_payers");
    const checked = checkPlan(
      { steps: [{ action: "collect", ids: ["c1", "c2", "made-up"], reason: "late_payers_first" }] },
      facts,
      seen,
    );
    expect(checked.steps[0].ids).toEqual(["c1", "c2"]);
    expect(checked.steps[0].amountPaise).toBe(720_000);
  });

  it("drops a step whose ids the model never saw", () => {
    const checked = checkPlan(
      { steps: [{ action: "pay_bills", ids: ["p-mt140"], reason: "within_your_limit" }] },
      facts,
      nothingSeen(),
    );
    expect(checked.steps).toEqual([]);
    expect(checked.dropped).toEqual([{ action: "pay_bills", why: "no_payable_bill_seen" }]);
  });

  it("never lets a held bill into the plan", () => {
    const seen = nothingSeen();
    runPlannerTool(facts, seen, "check_bill_limit");
    const checked = checkPlan(
      {
        steps: [{ action: "pay_bills", ids: ["p-sb2070", "p-mt140"], reason: "within_your_limit" }],
      },
      facts,
      seen,
    );
    expect(checked.steps[0].ids).toEqual(["p-mt140"]);
  });

  it("drops repeats, and the loan once the festival order is moved out of the week", () => {
    const seen = seenAll(facts);
    const checked = checkPlan(
      {
        steps: [
          { action: "move_festival_order", ids: [], reason: "festival_needs_money" },
          { action: "check_loan", reason: "cheaper_than_app_loans" },
          { action: "move_festival_order", ids: [], reason: "festival_needs_money" },
        ],
      },
      facts,
      seen,
    );
    expect(checked.steps.map((s) => s.action)).toEqual(["move_festival_order"]);
    expect(checked.dropped.map((d) => d.why).sort()).toEqual(["order_moved", "repeated"]);
  });
});

describe("rulesPlan", () => {
  it("collects first, pays inside the limit, reorders, then checks the loan", () => {
    const plan = rulesPlan(facts);
    const response = planResponse(checkPlan(plan, facts, seenAll(facts)), facts, {
      id: "r",
      plannedBy: "rules",
    });
    expect(response.steps.map((s) => s.action)).toEqual([
      "collect",
      "pay_bills",
      "reorder",
      "check_loan",
    ]);
    expect(response.steps.map((s) => s.gap_after_paise)).toEqual([
      -2_690_000, -2_690_000, -2_690_000, 10_000,
    ]);
    expect(response.steps[1].in_hand_after_paise).toBe(280_000);
  });
});

describe("runPlanner", () => {
  const call = (name: string, args: Record<string, unknown> = {}) => ({
    functionCalls: [{ id: name, name, args }],
    content: { role: "model", parts: [{ functionCall: { name, args } }] } as Content,
  });

  it("runs the tools the model asks for, then returns its plan", async () => {
    const script = [
      call("list_late_payers"),
      call("finish_plan", {
        steps: [{ action: "collect", ids: ["c1"], reason: "late_payers_first" }],
      }),
    ];
    const generate: Generate = async () => script.shift() ?? {};
    const events: string[] = [];
    const seen = nothingSeen();
    const outcome = await runPlanner(
      { generate, onEvent: async (event) => void events.push(`${event.kind}:${event.name}`) },
      { facts, seen, goal: "" },
    );
    expect(events).toEqual(["tool_call:list_late_payers", "tool_result:list_late_payers"]);
    expect(outcome.plan?.steps[0].ids).toEqual(["c1"]);
    expect(seen.customers.has("c1")).toBe(true);
  });

  it("reports a problem instead of throwing when the model fails", async () => {
    const generate: Generate = async () => {
      throw new Error("quota");
    };
    const outcome = await runPlanner(
      { generate, onEvent: async () => undefined },
      { facts, seen: nothingSeen(), goal: "" },
    );
    expect(outcome).toEqual({ plan: null, problem: "quota" });
  });

  it("refuses a finish_plan that carries anything outside the plan's shape", async () => {
    const generate: Generate = async () =>
      call("finish_plan", { steps: [{ action: "lend_money", reason: "close_the_gap" }] });
    const outcome = await runPlanner(
      { generate, onEvent: async () => undefined },
      { facts, seen: nothingSeen(), goal: "" },
    );
    expect(outcome.plan).toBeNull();
    expect(outcome.problem).toMatch(/finish_plan did not match/);
  });
});
