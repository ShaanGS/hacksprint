import type { Generate } from "@/lib/agent/run-turn";
import { createGemini } from "@/lib/gemini/client";

// Each model call gets its own deadline: a turn makes at most three, inside a 4 s budget, so a
// slow call fails fast and the customer hears a template instead of silence.
const CALL_TIMEOUT_MS = 6_000;

/** The real model behind the agent loop's `generate`. */
export function geminiGenerate(): Generate {
  const { ai, model } = createGemini();
  return async (contents, config) => {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { ...config, abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS) },
    });
    const functionCalls = response.functionCalls;
    return {
      functionCalls,
      // Reading .text while the model is calling tools only logs a warning, so skip it then.
      text: functionCalls?.length ? undefined : response.text,
      content: response.candidates?.[0]?.content,
    };
  };
}
