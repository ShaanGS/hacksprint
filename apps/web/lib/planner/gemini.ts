import { createGemini } from "@/lib/gemini/client";
import type { Generate } from "@/lib/planner/run";

// Each planning call gets its own deadline, so a slow call fails over to the rules planner
// instead of leaving the owner watching a spinner. A run makes at most five calls.
const CALL_TIMEOUT_MS = 8_000;

/** The real model behind the planner loop's `generate`. */
export function geminiPlanner(): Generate {
  const { ai, model } = createGemini();
  return async (contents, config) => {
    const response = await ai.models.generateContent({
      model,
      contents,
      config: { ...config, abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS) },
    });
    return { functionCalls: response.functionCalls, content: response.candidates?.[0]?.content };
  };
}
