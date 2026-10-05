import {
  ThinkingLevel,
  type Content,
  type FunctionDeclaration,
  type GenerateContentConfig,
} from "@google/genai";
import { createGemini } from "@/lib/gemini/client";
import { elapsed, fail, pass, type SmokeResult } from "./report";

const TOOL_NAME = "check_item_available";

// A dummy tool shaped like the agent's real ones: the model asks, our code answers.
const checkItemAvailable: FunctionDeclaration = {
  name: TOOL_NAME,
  description: "Checks whether the shop has an item in stock.",
  parametersJsonSchema: {
    type: "object",
    properties: { item: { type: "string", description: "The item the customer asked for" } },
    required: ["item"],
  },
};

const config: GenerateContentConfig = {
  tools: [{ functionDeclarations: [checkItemAvailable] }],
  // We execute tools ourselves, so the SDK must never call them.
  automaticFunctionCalling: { disable: true },
  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
};

export async function smokeGemini(): Promise<SmokeResult> {
  const { ai, model } = createGemini();
  const contents: Content[] = [
    { role: "user", parts: [{ text: "Do you have Maggi? Check with the tool before answering." }] },
  ];

  const askStart = performance.now();
  const first = await ai.models.generateContent({ model, contents, config });
  const call = first.functionCalls?.[0];
  const modelTurn = first.candidates?.[0]?.content;
  const callLine = `${model} called ${call?.name ?? "no tool"} ${JSON.stringify(call?.args ?? {})} in ${elapsed(askStart)}`;
  if (!call || call.name !== TOOL_NAME || !modelTurn) {
    return fail(callLine, `expected a ${TOOL_NAME} call`);
  }

  // Send the model's own turn back unchanged: it carries the thought signature that Gemini 3
  // requires. Then our result, under the same call id and name.
  contents.push(modelTurn, {
    role: "user",
    parts: [{ functionResponse: { id: call.id, name: call.name, response: { available: true } } }],
  });
  const answerStart = performance.now();
  const second = await ai.models.generateContent({ model, contents, config });
  const answer = second.text?.trim() ?? "";
  const answerLine = `answered "${answer}" in ${elapsed(answerStart)}`;

  return answer ? pass(callLine, answerLine) : fail(callLine, answerLine, "expected a text answer");
}
