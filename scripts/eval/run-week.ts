import type { PlannerFacts } from "@/lib/planner/facts";
import { checkPlan } from "@/lib/planner/plan";
import { runPlanner, type Generate, type PlannerEvent, type Usage } from "@/lib/planner/run";
import { nothingSeen } from "@/lib/planner/tools";

// One run of the live planner on a fixed week, shared by the planner eval and the attack eval.
// Besides the checked plan it keeps the model's own plan before any check, what the guardrails
// fixed, and everything the run sent to Gemini, so the attack eval can show what left the shop.

export const MAX_CALLS = 5;
// The free tier allows 15 calls a minute and a week can take 5, so weeks are spaced out, and a
// week that hit the limit is run once more after Gemini's minute is up.
export const PAUSE_MS = 15_000;
const RATE_LIMIT_WAIT_MS = 60_000;

export const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

type Week = { facts: PlannerFacts; goal: string };

async function runOnce(generate: Generate, week: Week) {
  const seen = nothingSeen();
  const events: PlannerEvent[] = [];
  // Every call resends the whole conversation, so a set keeps each part once.
  const sent = new Set<string>();
  const recorded: Generate = (contents, config) => {
    for (const part of contents.filter((c) => c.role === "user").flatMap((c) => c.parts ?? [])) {
      if (part.text) sent.add(part.text);
      if (part.functionResponse?.response) sent.add(JSON.stringify(part.functionResponse.response));
    }
    return generate(contents, config);
  };

  const started = Date.now();
  const outcome = await runPlanner(
    {
      generate: recorded,
      onEvent: async (event) => {
        events.push(event);
      },
    },
    { facts: week.facts, seen, goal: week.goal },
  );
  const ms = Date.now() - started;

  const calls = events.filter((event) => event.kind === "model_call");
  const tokens = (count: (usage: Usage) => number) =>
    calls.reduce((sum, call) => sum + (call.usage ? count(call.usage) : 0), 0);
  return {
    outcome,
    plan: outcome.plan ? checkPlan(outcome.plan, week.facts, seen) : null,
    proposed: events.find((event) => event.kind === "proposed")?.plan ?? null,
    tools: events.filter((event) => event.kind === "tool_call").map((event) => event.name),
    calls: calls.length,
    usage: {
      inputTokens: tokens((usage) => usage.inputTokens),
      outputTokens: tokens((usage) => usage.outputTokens),
    },
    ms,
    sent: [...sent].join("\n"),
    fixes: events.filter((event) => event.kind === "guardrail").map((event) => event.fix),
  };
}

/** One week through the planner, retried once if Gemini's rate limit stopped it. */
export async function runWeek(generate: Generate, week: Week) {
  const first = await runOnce(generate, week);
  if (!first.outcome.problem?.includes("429")) return first;
  await sleep(RATE_LIMIT_WAIT_MS);
  const second = await runOnce(generate, week);
  // What the stopped try sent still left the shop.
  return { ...second, sent: `${first.sent}\n${second.sent}` };
}

export type WeekRun = Awaited<ReturnType<typeof runWeek>>;
