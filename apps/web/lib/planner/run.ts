import {
  FunctionCallingConfigMode,
  ThinkingLevel,
  type Content,
  type FunctionCall,
  type GenerateContentConfig,
  type Part,
} from "@google/genai";
import type { PlannerFacts } from "@/lib/planner/facts";
import { summaryOf } from "@/lib/planner/facts";
import { cleanText, fix, scrubPersonalData, type Fixed } from "@/lib/planner/guardrails";
import { rawPlan, type RawPlan } from "@/lib/planner/plan";
import { plannerPrompt } from "@/lib/planner/prompt";
import { plannerTools, runPlannerTool, type Seen } from "@/lib/planner/tools";

// The planner loop: the model reads the summary, calls read tools for the detail it wants, and
// must finish with finish_plan. Every call is allowed only to call a tool (mode ANY), so it
// never writes free text, and the last one may only finish. The same pattern as the frozen
// ordering agent's loop, kept separate because that code is frozen.
//
// Two guardrails live here because they guard the context itself: everything that enters it is
// scrubbed of personal data first, and a run that grows past its token budget must finish.

const MAX_CALLS = 5;
const CONTEXT_BUDGET_TOKENS = 16_000;
const GOAL_CHARS = 300;

/** Tokens one model call used: what went in (the context), what came out, and its thinking. */
export type Usage = { inputTokens: number; outputTokens: number; thoughtTokens: number };

export type ModelResponse = { functionCalls?: FunctionCall[]; content?: Content; usage?: Usage };
export type Generate = (
  contents: Content[],
  config: GenerateContentConfig,
) => Promise<ModelResponse>;

/** One thing the run did, for the live step rail and the run's saved record. */
export type PlannerEvent =
  | { kind: "model_call"; call: number; usage: Usage | null }
  | { kind: "tool_call"; name: string }
  | { kind: "tool_result"; name: string; result: Record<string, unknown> }
  | { kind: "proposed"; plan: RawPlan }
  | { kind: "guardrail"; fix: Fixed };

/** offSchema: the model finished, but its plan broke the fixed form (an unknown action, say). */
export type PlannerOutcome = { plan: RawPlan | null; problem?: string; offSchema?: boolean };

export async function runPlanner(
  deps: { generate: Generate; onEvent: (event: PlannerEvent) => Promise<void> },
  input: { facts: PlannerFacts; seen: Seen; goal: string },
): Promise<PlannerOutcome> {
  const base: GenerateContentConfig = {
    systemInstruction: plannerPrompt,
    tools: [{ functionDeclarations: plannerTools }],
    // We run the tools ourselves; the SDK must never call them.
    automaticFunctionCalling: { disable: true },
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  };
  const anyTool: GenerateContentConfig = {
    ...base,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.ANY } },
  };
  const finishOnly: GenerateContentConfig = {
    ...base,
    toolConfig: {
      functionCallingConfig: {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: ["finish_plan"],
      },
    },
  };

  // Whatever enters the context is scrubbed first; what was removed is counted and recorded.
  const guarded = async <T>(value: T): Promise<T> => {
    const scrubbed = scrubPersonalData(value);
    if (scrubbed.removed > 0) {
      await deps.onEvent({
        kind: "guardrail",
        fix: fix("personal_data_removed", scrubbed.removed),
      });
    }
    return scrubbed.value;
  };

  try {
    const opening = await guarded({
      summary: summaryOf(input.facts),
      owner_asked: cleanText(input.goal, GOAL_CHARS) || null,
    });
    const contents: Content[] = [{ role: "user", parts: [{ text: JSON.stringify(opening) }] }];
    let mustFinish = false;

    for (let call = 1; call <= MAX_CALLS; call++) {
      const last = mustFinish || call === MAX_CALLS;
      const response = await deps.generate(contents, last ? finishOnly : anyTool);
      await deps.onEvent({ kind: "model_call", call, usage: response.usage ?? null });
      const calls = response.functionCalls ?? [];
      if (calls.length === 0) return { plan: null, problem: "the model called no tool" };

      const finish = calls.find((fc) => fc.name === "finish_plan");
      if (finish) {
        const parsed = rawPlan.safeParse(finish.args ?? {});
        if (!parsed.success) {
          return {
            plan: null,
            problem: `finish_plan did not match: ${parsed.error.message}`,
            offSchema: true,
          };
        }
        await deps.onEvent({ kind: "proposed", plan: parsed.data });
        return { plan: parsed.data };
      }

      const results: Part[] = [];
      for (const fc of calls) {
        const name = fc.name ?? "";
        await deps.onEvent({ kind: "tool_call", name });
        const result = await guarded(runPlannerTool(input.facts, input.seen, name));
        await deps.onEvent({ kind: "tool_result", name, result });
        results.push({ functionResponse: { id: fc.id, name, response: result } });
      }
      if (!mustFinish && (response.usage?.inputTokens ?? 0) > CONTEXT_BUDGET_TOKENS) {
        mustFinish = true;
        await deps.onEvent({ kind: "guardrail", fix: fix("stopped_early") });
      }
      if (!response.content) return { plan: null, problem: "model turn missing" };
      // The model's own turn goes back unchanged: it carries the thought signature Gemini needs.
      contents.push(response.content, { role: "user", parts: results });
    }
    return { plan: null, problem: "no plan after the last call" };
  } catch (error) {
    return { plan: null, problem: error instanceof Error ? error.message : String(error) };
  }
}
