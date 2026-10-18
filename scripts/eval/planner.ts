// `pnpm eval:planner` runs the live planner (Gemini, the same loop the app uses) on fixed weeks
// and scores each plan against the behaviour we promise, plus three checks every plan must pass:
// the model answered, every step pointed at something a tool showed, and it stayed inside the
// call budget. It prints a scorecard; it is an eval, not a unit test, so it needs the Gemini key
// and costs a few calls per week. `pnpm eval:planner "good week"` runs only the weeks whose name
// has that text.
import { geminiPlanner } from "@/lib/planner/gemini";
import { MAX_CALLS, PAUSE_MS, runWeek, sleep } from "./run-week";
import { scenarios } from "./scenarios";

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
    const { outcome, plan, tools, calls, usage, ms } = await runWeek(generate, scenario);
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
