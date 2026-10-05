import { GoogleGenAI } from "@google/genai";
import { geminiEnv } from "@/lib/env";

/**
 * The Gemini client and the model to use, both from env. The key is passed explicitly because
 * the SDK would otherwise prefer a GOOGLE_API_KEY that happens to be set in the shell.
 */
export function createGemini(): { ai: GoogleGenAI; model: string } {
  const env = geminiEnv();
  return {
    ai: new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: 15_000 } }),
    model: env.GEMINI_MODEL,
  };
}
