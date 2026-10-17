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
import { rawPlan, type RawPlan } from "@/lib/planner/plan";
import { plannerPrompt } from "@/lib/planner/prompt";
import { plannerTools, runPlannerTool, type Seen } from "@/lib/planner/tools";

// The planner loop: the model reads the summary, calls read tools for the detail it wants, and
// must finish with finish_plan. Every call is allowed only to call a tool (mode ANY), so it
// never writes free text, and the last one may only finish. The same pattern as the frozen
// ordering agent's loop, kept separate because that code is frozen.

const MAX_CALLS = 5;

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
  | { kind: "tool_result"; name: string; result: Record<string, unknown> };

export type PlannerOutcome = { plan: RawPlan | null; problem?: string };

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

  const opening = { summary: summaryOf(input.facts), owner_asked: input.goal || null };
  const contents: Content[] = [{ role: "user", parts: [{ text: JSON.stringify(opening) }] }];

  try {
    for (let call = 1; call <= MAX_CALLS; call++) {
      const response = await deps.generate(contents, call === MAX_CALLS ? finishOnly : anyTool);
      await deps.onEvent({ kind: "model_call", call, usage: response.usage ?? null });
      const calls = response.functionCalls ?? [];
      if (calls.length === 0) return { plan: null, problem: "the model called no tool" };

      const finish = calls.find((fc) => fc.name === "finish_plan");
      if (finish) {
        const parsed = rawPlan.safeParse(finish.args ?? {});
        return parsed.success
          ? { plan: parsed.data }
          : { plan: null, problem: `finish_plan did not match: ${parsed.error.message}` };
      }

      const results: Part[] = [];
      for (const fc of calls) {
        const name = fc.name ?? "";
        await deps.onEvent({ kind: "tool_call", name });
        const result = runPlannerTool(input.facts, input.seen, name);
        await deps.onEvent({ kind: "tool_result", name, result });
        results.push({ functionResponse: { id: fc.id, name, response: result } });
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
