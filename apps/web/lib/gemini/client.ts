import { GoogleGenAI } from "@google/genai";
import { geminiEnv } from "@/lib/env";

/**
 * The model client and the model to use, both from env: Vertex AI when GEMINI_USE_VERTEX is
 * true, else the Gemini API. The key and `vertexai` are passed explicitly because the SDK would
 * otherwise follow a GOOGLE_API_KEY or GOOGLE_GENAI_USE_VERTEXAI that happens to be in the shell.
 */
export function createGemini(): { ai: GoogleGenAI; model: string } {
  const env = geminiEnv();
  return {
    ai: new GoogleGenAI({
      vertexai: env.vertex,
      apiKey: env.apiKey,
      httpOptions: { timeout: 15_000 },
    }),
    model: env.model,
  };
}
