import type { SupabaseClient } from "@supabase/supabase-js";
import { audit } from "@/lib/audit";
import { loadProfile } from "@/lib/loans/profile";
import { billLimitFacts } from "@/lib/planner/bill-limit";
import { plannerFacts, summaryOf, type PlannerFacts } from "@/lib/planner/facts";
import { rulesPlan } from "@/lib/planner/fallback";
import { geminiPlanner } from "@/lib/planner/gemini";
import { stop, type Fixed } from "@/lib/planner/guardrails";
import { checkPlan, planResponse, type PlanResponse } from "@/lib/planner/plan";
import { finishRun, lastPlan, startRun, stepRecorder } from "@/lib/planner/record";
import { runPlanner, type Generate, type PlannerOutcome } from "@/lib/planner/run";
import { nothingSeen, runPlannerTool, type Seen } from "@/lib/planner/tools";
import { loadFestivalOrder } from "@/lib/rotation/festival";
import { loadShopData } from "@/lib/rotation/load";
import type { Shop } from "@/lib/shop";

// One planning run, start to end: read the shop once, save the run, let the model plan over
// the tools (or the rules when it cannot), pass the plan through the guardrails, and stream each
// step as it happens. The run record keeps what the model proposed next to what passed.

/** Model calls in a run and the tokens they used, summed. */
export type RunUsage = {
  calls: number;
  input_tokens: number;
  output_tokens: number;
  thought_tokens: number;
};

export type PlanLine =
  | { type: "step"; name: string; meta: Record<string, unknown> }
  | ({ type: "plan"; usage: RunUsage } & PlanResponse);

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

    // What the run cost in context: every model call's tokens, saved and summed for the screen.
    const usage: RunUsage = { calls: 0, input_tokens: 0, output_tokens: 0, thought_tokens: 0 };
    const runFixes: Fixed[] = [];
    let seen = nothingSeen();
    const model = await modelPlan(facts, seen, goal, async (event) => {
      switch (event.kind) {
        case "model_call":
          usage.calls += 1;
          usage.input_tokens += event.usage?.inputTokens ?? 0;
          usage.output_tokens += event.usage?.outputTokens ?? 0;
          usage.thought_tokens += event.usage?.thoughtTokens ?? 0;
          await record("note", "model_call", { call: event.call, ...event.usage });
          break;
        case "tool_call":
          await record("tool_call", event.name, {});
          break;
        case "tool_result":
          await shown(event.name, event.result);
          break;
        case "proposed":
          await record("note", "proposed", event.plan);
          break;
        case "guardrail":
          runFixes.push(event.fix);
          await record("note", "guardrail", event.fix);
          break;
      }
    });
    const fromModel = model.plan ? checkPlan(model.plan, facts, seen) : null;
    const usable =
      model.plan !== null &&
      fromModel !== null &&
      (fromModel.steps.length > 0 || model.plan.steps.length === 0);
    let checked = fromModel ?? { steps: [], dropped: [], fixed: [] };
    // What the guardrails stopped stays on the record, even when the rules plan instead.
    const modelStops = usable
      ? []
      : [...(model.offSchema ? [stop(null, "off_schema")] : []), ...(fromModel?.dropped ?? [])];
    if (!usable) {
      await record("note", "rules", {
        why: model.problem ?? "every step the model planned broke a guardrail",
      });
      // The rules read every tool, and the rail shows them doing it.
      seen = nothingSeen();
      for (const name of readTools) await shown(name, runPlannerTool(facts, seen, name));
      checked = checkPlan(rulesPlan(facts), facts, seen);
    }
    const plannedBy = usable ? "model" : "rules";
    const guarded = {
      ...checked,
      dropped: [...modelStops, ...checked.dropped],
      fixed: [...runFixes, ...checked.fixed],
    };
    const response = {
      ...planResponse(guarded, facts, {
        id: runId,
        plannedBy,
        rulesBecause: model.plan || model.offSchema ? "plan_blocked" : "no_answer",
      }),
      usage,
    };
    await record("note", "guardrails", response.guardrails);
    await record("plan", "plan", response);
    await finishRun(db, runId, { status: "done", plannedBy });
    await audit(db, shop.id, [
      {
        actor: "agent",
        action: "planner.plan",
        entityType: "agent_run",
        entityId: runId,
        payload: {
          planned_by: plannedBy,
          actions: response.steps.map((s) => s.action),
          blocked: response.dropped.map((d) => d.why),
          fixed: response.fixed.map((f) => f.what),
          usage,
        },
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
): Promise<PlannerOutcome> {
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
    case "check_bill_limit":
      return {
        set: result.mandate !== null,
        pay: count("can_pay_now") + count("can_pay_after_collecting"),
        hold: count("on_hold"),
      };
    default:
      return {};
  }
}
