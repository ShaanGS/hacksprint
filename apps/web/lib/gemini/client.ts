import { ApiError, GoogleGenAI } from "@google/genai";
import { geminiEnv } from "@/lib/env";

/** The one Gemini call the app makes, so a client can be a real SDK client or the fallback pair. */
export type Gemini = { models: { generateContent: GoogleGenAI["models"]["generateContent"] } };

// A second key takes over when the first is rate-limited, refused or Gemini is busy, so a demo
// never stalls on one free-tier quota. Timeouts are not retried: every caller has its own deadline
// and its own fallback (the rules planner, the word fallback for voice, a retake for bills).
const RETRY_ON = new Set([401, 403, 429, 503]);

export function withFallback(primary: Gemini, fallback: Gemini): Gemini {
  return {
    models: {
      generateContent: async (params) => {
        try {
          return await primary.models.generateContent(params);
        } catch (error) {
          if (!(error instanceof ApiError) || !RETRY_ON.has(error.status)) throw error;
          return fallback.models.generateContent(params);
        }
      },
    },
  };
}

/**
 * The Gemini client and the model to use, both from env. The key is passed explicitly because
 * the SDK would otherwise prefer a GOOGLE_API_KEY that happens to be set in the shell.
 */
export function createGemini(): { ai: Gemini; model: string } {
  const env = geminiEnv();
  const client = (apiKey: string) => new GoogleGenAI({ apiKey, httpOptions: { timeout: 15_000 } });
  const primary = client(env.GEMINI_API_KEY);
  return {
    ai: env.GEMINI_FALLBACK_API_KEY
      ? withFallback(primary, client(env.GEMINI_FALLBACK_API_KEY))
      : primary,
    model: env.GEMINI_MODEL,
  };
}
