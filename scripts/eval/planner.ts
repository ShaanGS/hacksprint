// `pnpm eval:planner` runs the live planner (Gemini, the same loop the app uses) on fixed weeks
// and scores each plan against the behaviour we promise, plus three checks every plan must pass:
// the model answered, every step pointed at something a tool showed, and it stayed inside the
// call budget. It prints a scorecard; it is an eval, not a unit test, so it needs the Gemini key
// and costs a few calls per week. `pnpm eval:planner "good week"` runs only the weeks whose name
// has that text.
import { geminiPlanner } from "@/lib/planner/gemini";
import { checkPlan } from "@/lib/planner/plan";
import { runPlanner, type Generate, type Usage } from "@/lib/planner/run";
import { nothingSeen } from "@/lib/planner/tools";
import { scenarios, type Scenario } from "./scenarios";

const MAX_CALLS = 5;
// The free tier allows 15 calls a minute and a week can take 5, so weeks are spaced out, and a
// week that hit the limit is run once more after Gemini's minute is up.
const PAUSE_MS = 15_000;
const RATE_LIMIT_WAIT_MS = 60_000;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function runWeek(generate: Generate, scenario: Scenario) {
  const seen = nothingSeen();
  const usage: Usage = { inputTokens: 0, outputTokens: 0, thoughtTokens: 0 };
  const tools: string[] = [];
  let calls = 0;
  const started = Date.now();
  const outcome = await runPlanner(
    {
      generate,
      onEvent: async (event) => {
        if (event.kind === "tool_call") tools.push(event.name);
        if (event.kind !== "model_call") return;
        calls += 1;
        usage.inputTokens += event.usage?.inputTokens ?? 0;
        usage.outputTokens += event.usage?.outputTokens ?? 0;
      },
    },
    { facts: scenario.facts, seen, goal: scenario.goal },
  );
  const plan = outcome.plan ? checkPlan(outcome.plan, scenario.facts, seen) : null;
  return { outcome, plan, tools, calls, usage, ms: Date.now() - started };
}

async function main() {
  try {
    process.loadEnvFile("apps/web/.env.local");
  } catch {
    // The variables may already be in the environment.
  }
  const generate = geminiPlanner();
  let passed = 0;
  let total = 0;

  const only = process.argv[2] ?? "";
  for (const [index, scenario] of scenarios.filter((s) => s.name.includes(only)).entries()) {
    if (index > 0) await sleep(PAUSE_MS);
    let week = await runWeek(generate, scenario);
    if (week.outcome.problem?.includes("429")) {
      await sleep(RATE_LIMIT_WAIT_MS);
      week = await runWeek(generate, scenario);
    }
    const { outcome, plan, tools, calls, usage, ms } = week;
    const results = [
      { name: "the model answered", pass: plan !== null },
      { name: "grounded: nothing dropped", pass: plan !== null && plan.dropped.length === 0 },
      { name: `at most ${MAX_CALLS} calls`, pass: calls <= MAX_CALLS },
      ...scenario.checks.map((check) => ({
        name: check.name,
        pass: plan !== null && check.pass(plan),
      })),
    ];
    passed += results.filter((r) => r.pass).length;
    total += results.length;
    const steps = plan
      ? plan.steps.map((s) => s.action).join(" > ") || "(nothing to do)"
      : `no plan: ${(outcome.problem ?? "").slice(0, 100)}`;
    console.log(
      [
        `\n${scenario.name}`,
        `  tools: ${tools.join(", ") || "none"}`,
        `  plan: ${steps}`,
        `  ${calls} calls, ${usage.inputTokens} tokens in, ${usage.outputTokens} out, ${(ms / 1000).toFixed(1)} s`,
        ...results.map((r) => `  ${r.pass ? "ok  " : "FAIL"} ${r.name}`),
        ...(plan?.dropped ?? []).map((d) => `  dropped ${d.action}: ${d.why}`),
      ].join("\n"),
    );
  }

  console.log(`\n${passed} of ${total} checks passed (${Math.round((100 * passed) / total)}%).`);
  if (passed < total) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
