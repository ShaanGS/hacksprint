import { z } from "zod";

const SETUP_HINT = "Copy apps/web/.env.example to apps/web/.env.local and fill it in.";

/** A service's environment variables are missing or invalid. `problems` has one line per key. */
export class EnvError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Environment is not set up:\n  ${problems.join("\n  ")}\n${SETUP_HINT}`);
    this.name = "EnvError";
    this.problems = problems;
  }
}

const missing = { error: "is missing" };
const text = () => z.string(missing).min(1, missing);
const httpUrl = () => text().pipe(z.url({ protocol: /^https?$/, error: "must be an http(s) URL" }));

const appSchema = z.object({
  APP_URL: httpUrl(),
  OWNER_PIN: text().regex(/^\d{4}$/, "must be 4 digits"),
  // Signs the owner and customer session cookies.
  SESSION_SECRET: text().min(32, "must be at least 32 characters (openssl rand -hex 32)"),
  // Scripts and n8n call the API with it (spec section 13); the browser never holds it.
  SHOP_TOKEN: text().min(32, "must be at least 32 characters (openssl rand -hex 32)"),
});

const supabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: httpUrl(),
  // The prefixes catch the two keys being swapped, which would ship the secret key to browsers.
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: text().startsWith(
    "sb_publishable_",
    "must start with sb_publishable_",
  ),
  SUPABASE_SECRET_KEY: text().startsWith("sb_secret_", "must start with sb_secret_"),
});

const geminiSchema = z.object({
  GEMINI_API_KEY: text(),
  GEMINI_MODEL: text(),
});

const sarvamSchema = z.object({
  SARVAM_API_KEY: text(),
  SARVAM_STT_MODEL: text(),
  SARVAM_TTS_MODEL: text(),
});

const paytmSchema = z.object({
  PAYTM_BASE_URL: httpUrl(),
  PAYTM_MID: text(),
  // Paytm signs with AES-128, which needs a 16-character key. Another length usually means the MID was pasted.
  PAYTM_MERCHANT_KEY: text().length(16, "must be 16 characters (the merchant key, not the MID)"),
});

const n8nSchema = z.object({
  N8N_WEBHOOK_URL: httpUrl(),
  N8N_WEBHOOK_SECRET: text().min(32, "must be at least 32 characters (openssl rand -hex 32)"),
});

function parse<T extends z.ZodType>(service: string, schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (result.success) return result.data;
  throw new EnvError(
    result.error.issues.map((issue) => `${service}: ${issue.path.join(".")} ${issue.message}`),
  );
}

export const appEnv = () => parse("App", appSchema);
export const supabaseEnv = () => parse("Supabase", supabaseSchema);
export const geminiEnv = () => parse("Gemini", geminiSchema);
export const sarvamEnv = () => parse("Sarvam", sarvamSchema);
// Paytm and n8n are checked on first use: Paytm keys may arrive late (spec 5.4), n8n starts in milestone 4.
export const paytmEnv = () => parse("Paytm", paytmSchema);
export const n8nEnv = () => parse("n8n", n8nSchema);

// The keys that connect the app to its services. With none of them set, the app runs as a
// preview: the screens work on sample data, so the team can see them before the keys exist.
const serviceKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "GEMINI_API_KEY",
  "SARVAM_API_KEY",
];

/** The stage fallbacks (mark-paid, demo reset) and the "demo data" label are on. */
export function demoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

/** In the demo, the late payer's reminder goes to a teammate's real WhatsApp number. */
export function demoPayerPhone(): string | null {
  return process.env.DEMO_PAYER_PHONE || null;
}

export function isPreview(): boolean {
  return serviceKeys.every((key) => !process.env[key]);
}

/** Checks every service the app cannot start without, and reports all problems at once. */
export function assertStartupEnv(): void {
  const problems = [appEnv, supabaseEnv, geminiEnv, sarvamEnv].flatMap((check) => {
    try {
      check();
      return [];
    } catch (error) {
      if (error instanceof EnvError) return error.problems;
      throw error;
    }
  });
  if (problems.length > 0) throw new EnvError(problems);
}
