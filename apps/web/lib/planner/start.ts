import type { SupabaseClient } from "@supabase/supabase-js";
import { audit } from "@/lib/audit";
import { loadProfile } from "@/lib/loans/profile";
import { billLimitFacts } from "@/lib/planner/bill-limit";
import { plannerFacts, summaryOf, type PlannerFacts } from "@/lib/planner/facts";
import { rulesPlan } from "@/lib/planner/fallback";
import { geminiPlanner } from "@/lib/planner/gemini";
import { checkPlan, planResponse, type PlanResponse, type RawPlan } from "@/lib/planner/plan";
import { finishRun, lastPlan, startRun, stepRecorder } from "@/lib/planner/record";
import { runPlanner, type Generate } from "@/lib/planner/run";
import { nothingSeen, runPlannerTool, type Seen } from "@/lib/planner/tools";
import { loadFestivalOrder } from "@/lib/rotation/festival";
import { loadShopData } from "@/lib/rotation/load";
import type { Shop } from "@/lib/shop";

// One planning run, start to end: read the shop once, save the run, let the model plan over
// the tools (or the rules when it cannot), check the plan, and stream each step as it happens.

export type PlanLine =
  { type: "step"; name: string; meta: Record<string, unknown> } | ({ type: "plan" } & PlanResponse);

const readTools = [
  "look_at_week",
  "list_late_payers",
  "list_bills_due",
  "check_stock",
  "check_loan",
  "check_bill_limit",
];

export async function planWeek(
  db: SupabaseClient,
  shop: Shop,
  goal: string,
  send: (line: PlanLine) => void,
): Promise<void> {
  const data = await loadShopData(db, shop.id);
  const festival = await loadFestivalOrder(db, shop.id, data.receipts);
  const [profile, previous, billLimit] = await Promise.all([
    loadProfile(db, shop.id),
    lastPlan(db, shop.id, data),
    billLimitFacts(db, shop.id, data),
  ]);
  const facts = plannerFacts({
    data,
    festival,
    repaidTarunBefore: profile.repaidTarunBefore,
    billLimit,
    lastPlan: previous,
  });

  const runId = await startRun(db, shop.id, "planner", goal);
  const record = stepRecorder(db, runId);
  try {
    await record("summary", "summary", summaryOf(facts));
    send({ type: "step", name: "summary", meta: { state: facts.week.state } });
    const shown = async (name: string, result: Record<string, unknown>) => {
      await record("tool_result", name, result);
      send({ type: "step", name, meta: metaOf(name, result) });
    };

    let seen = nothingSeen();
    const model = await modelPlan(facts, seen, goal, async (event) => {
      if (event.kind === "tool_call") await record("tool_call", event.name, {});
      else await shown(event.name, event.result);
    });
    let plan = model.plan;
    let checked = plan ? checkPlan(plan, facts, seen) : null;
    const usable = plan && checked && (checked.steps.length > 0 || plan.steps.length === 0);
    if (!usable) {
      await record("note", "rules", {
        why: model.problem ?? "the model's plan pointed at nothing",
      });
      // The rules read every tool, and the rail shows them doing it.
      seen = nothingSeen();
      for (const name of readTools) await shown(name, runPlannerTool(facts, seen, name));
      plan = rulesPlan(facts);
      checked = checkPlan(plan, facts, seen);
    }
    const plannedBy = usable ? "model" : "rules";
    const response = planResponse(checked ?? { steps: [], dropped: [] }, facts, {
      id: runId,
      plannedBy,
    });
    await record("plan", "plan", response);
    await finishRun(db, runId, { status: "done", plannedBy });
    await audit(db, shop.id, [
      {
        actor: "agent",
        action: "planner.plan",
        entityType: "agent_run",
        entityId: runId,
        payload: { planned_by: plannedBy, actions: response.steps.map((s) => s.action) },
      },
    ]);
    send({ type: "plan", ...response });
  } catch (error) {
    await finishRun(db, runId, { status: "failed", plannedBy: null }).catch(() => undefined);
    throw error;
  }
}

async function modelPlan(
  facts: PlannerFacts,
  seen: Seen,
  goal: string,
  onEvent: Parameters<typeof runPlanner>[0]["onEvent"],
): Promise<{ plan: RawPlan | null; problem?: string }> {
  let generate: Generate;
  try {
    generate = geminiPlanner();
  } catch (error) {
    return { plan: null, problem: error instanceof Error ? error.message : "no model" };
  }
  return runPlanner({ generate, onEvent }, { facts, seen, goal });
}

/** A few numbers per step for the live rail, taken from what the tool returned. */
function metaOf(name: string, result: Record<string, unknown>): Record<string, unknown> {
  const count = (key: string) =>
    Array.isArray(result[key]) ? (result[key] as unknown[]).length : 0;
  switch (name) {
    case "look_at_week":
      return { state: result.state, gap_paise: result.gap_paise };
    case "list_late_payers":
      return { count: count("customers") };
    case "list_bills_due":
      return { count: count("bills") };
    case "check_stock":
      return { low: count("running_out"), groups: count("reorder") };
    case "check_loan":
      return { loan_needed_paise: result.loan_needed_paise, band: result.mudra_band };
    case "check_bill_limit": {
      const decisions = Array.isArray(result.decisions)
        ? (result.decisions as { decision: string }[])
        : [];
      return {
        set: result.mandate !== null,
        pay: decisions.filter((d) => d.decision === "pay").length,
        hold: decisions.filter((d) => d.decision === "hold").length,
      };
    }
    default:
      return {};
  }
}
