import {
  FunctionCallingConfigMode,
  ThinkingLevel,
  type Content,
  type FunctionCall,
  type GenerateContentConfig,
  type Part,
} from "@google/genai";
import { looksLikeMoney } from "@/lib/agent/guard";
import { toolDeclarations, type ToolOutcome } from "@/lib/agent/tools";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import type { Choice, VoiceTurn } from "@/lib/voice/turns";

// One customer turn through the model. At most three calls, so a turn stays inside its time
// budget; the last call is not allowed to use tools, so it has to answer.

const MAX_CALLS = 3;
const HISTORY_TURNS = 12;
const MAX_REPLY_CHARS = 160;

export type ModelResponse = { functionCalls?: FunctionCall[]; text?: string; content?: Content };
export type Generate = (
  contents: Content[],
  config: GenerateContentConfig,
) => Promise<ModelResponse>;
export type RunTool = (name: string, args: unknown) => Promise<ToolOutcome>;

export type ToolCallRecord = { name: string; args: unknown; response: Record<string, unknown> };

export type AgentTurn = {
  /** What the shop says back; "review" means the order review opens and the read-back is said. */
  outcome: { kind: "reply"; text: string; source: "agent" | "template" } | { kind: "review" };
  choices: Choice[];
  toolCalls: ToolCallRecord[];
  /** Why the model's answer was not used, for the audit log. */
  problem?: string;
};

export type TurnInput = { systemPrompt: string; history: VoiceTurn[]; text: string; lang: Lang };

export async function runAgentTurn(
  deps: { generate: Generate; runTool: RunTool },
  input: TurnInput,
): Promise<AgentTurn> {
  const withTools: GenerateContentConfig = {
    systemInstruction: input.systemPrompt,
    tools: [{ functionDeclarations: toolDeclarations }],
    // We run the tools ourselves; the SDK must never call them.
    automaticFunctionCalling: { disable: true },
    thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  };
  const answerOnly: GenerateContentConfig = {
    ...withTools,
    toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.NONE } },
  };

  const contents = conversation(input.history, input.text);
  const toolCalls: ToolCallRecord[] = [];
  const outcomes: ToolOutcome[] = [];
  const done = (outcome: AgentTurn["outcome"], problem?: string): AgentTurn => ({
    outcome,
    choices: choicesFrom(outcomes),
    toolCalls,
    problem,
  });

  try {
    for (let call = 1; call <= MAX_CALLS; call++) {
      const response = await deps.generate(contents, call === MAX_CALLS ? answerOnly : withTools);
      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        const reply = checkReply(response.text ?? "", input.lang, toolCalls.length > 0);
        return done(reply.outcome, reply.problem);
      }

      const results: Part[] = [];
      for (const fc of calls) {
        const name = fc.name ?? "";
        const outcome = await deps.runTool(name, fc.args ?? {});
        outcomes.push(outcome);
        toolCalls.push({ name, args: fc.args ?? {}, response: outcome.response });
        results.push({ functionResponse: { id: fc.id, name, response: outcome.response } });
      }
      if (outcomes.some((o) => o.review)) return done({ kind: "review" });
      if (!response.content) return done(template(input.lang, true), "model turn missing");
      // The model's own turn goes back unchanged: it carries the thought signature Gemini needs.
      contents.push(response.content, { role: "user", parts: results });
    }
    return done(template(input.lang, true), "no answer after the last call");
  } catch (error) {
    const problem = error instanceof Error ? error.message : String(error);
    return done(template(input.lang, toolCalls.length > 0), problem);
  }
}

/** The recent conversation as model turns: customer is "user", shop is "model". */
function conversation(history: VoiceTurn[], text: string): Content[] {
  const turns = [...history.slice(-HISTORY_TURNS), { role: "customer", text }];
  const contents: Content[] = [];
  for (const turn of turns) {
    const role = turn.role === "customer" ? "user" : "model";
    const last = contents.at(-1);
    // Gemini wants the first turn from the user and the roles to alternate.
    if (!last && role === "model") continue;
    if (last?.role === role) last.parts?.push({ text: turn.text });
    else contents.push({ role, parts: [{ text: turn.text }] });
  }
  return contents;
}

function checkReply(
  raw: string,
  lang: Lang,
  toolsRan: boolean,
): { outcome: AgentTurn["outcome"]; problem?: string } {
  const text = shorten(raw.trim());
  if (!text) return { outcome: template(lang, toolsRan), problem: "empty reply" };
  if (looksLikeMoney(text)) {
    const t = textFor(lang);
    return {
      outcome: { kind: "reply", text: toolsRan ? t.noted : t.seePrices, source: "template" },
      problem: `reply mentioned money: ${text}`,
    };
  }
  return { outcome: { kind: "reply", text, source: "agent" } };
}

/** Keeps whole sentences up to the length limit; a long reply is slow to speak. */
function shorten(text: string): string {
  if (text.length <= MAX_REPLY_CHARS) return text;
  const head = text.slice(0, MAX_REPLY_CHARS);
  const end = Math.max(...[".", "?", "!", "।"].map((mark) => head.lastIndexOf(mark)));
  return end > 0 ? head.slice(0, end + 1) : text;
}

function template(lang: Lang, toolsRan: boolean): AgentTurn["outcome"] {
  const t = textFor(lang);
  return { kind: "reply", text: toolsRan ? t.noted : t.fallback, source: "template" };
}

/** Taps to offer: never one for a product this turn already changed, and each product once. */
function choicesFrom(outcomes: ToolOutcome[]): Choice[] {
  const changed = new Set(outcomes.flatMap((o) => (o.changedCode ? [o.changedCode] : [])));
  const seen = new Set<string>();
  return outcomes
    .flatMap((o) => o.choices)
    .filter((choice) => {
      if (changed.has(choice.code) || seen.has(choice.code)) return false;
      seen.add(choice.code);
      return true;
    })
    .slice(0, 3);
}
