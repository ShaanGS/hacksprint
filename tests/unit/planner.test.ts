import type { Content } from "@google/genai";
import { describe, expect, it } from "vitest";
import { rulesPlan, seenAll } from "@/lib/planner/fallback";
import { checkPlan, planResponse } from "@/lib/planner/plan";
import { runPlanner, type Generate } from "@/lib/planner/run";
import { nothingSeen, runPlannerTool } from "@/lib/planner/tools";
import { facts } from "./planner-fixture";

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
    expect(checked.dropped).toMatchObject([
      { action: "pay_bills", why: "no_bill_fits_limit", rule: "within_owner_limit" },
    ]);
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
    expect(checked.steps).toEqual([]);
  });

  it("allows a bill that collecting makes payable, only after the collect step", () => {
    const seen = nothingSeen();
    runPlannerTool(facts, seen, "list_late_payers");
    runPlannerTool(facts, seen, "check_bill_limit");
    const checked = checkPlan(
      {
        steps: [
          { action: "collect", ids: ["c1", "c2", "c3"], reason: "late_payers_first" },
          { action: "pay_bills", ids: ["p-mt140", "p-sb2070"], reason: "within_your_limit" },
        ],
      },
      facts,
      seen,
    );
    expect(checked.steps.map((s) => [s.action, s.ids])).toEqual([
      ["collect", ["c1", "c2", "c3"]],
      ["pay_bills", ["p-mt140"]],
    ]);
  });

  it("drops repeats, and the loan once the festival order is moved out of the week", () => {
    const seen = seenAll(facts);
    const checked = checkPlan(
      {
        steps: [
          { action: "collect", ids: ["c1"], reason: "late_payers_first" },
          { action: "move_festival_order", ids: [], reason: "festival_needs_money" },
          { action: "check_loan", reason: "cheaper_than_app_loans" },
          { action: "move_festival_order", ids: [], reason: "festival_needs_money" },
        ],
      },
      facts,
      seen,
    );
    expect(checked.steps.map((s) => s.action)).toEqual(["collect", "move_festival_order"]);
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
      {
        generate,
        onEvent: async (event) =>
          void events.push(
            event.kind === "model_call"
              ? `model_call:${event.call}`
              : "name" in event
                ? `${event.kind}:${event.name}`
                : event.kind,
          ),
      },
      { facts, seen, goal: "" },
    );
    expect(events).toEqual([
      "model_call:1",
      "tool_call:list_late_payers",
      "tool_result:list_late_payers",
      "model_call:2",
      "proposed",
    ]);
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
    expect(outcome.offSchema).toBe(true);
  });
});
