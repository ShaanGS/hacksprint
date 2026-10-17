import { describe, expect, it, vi } from "vitest";
import { assertStartupEnv, EnvError, geminiEnv, isPreview, paytmEnv } from "@/lib/env";

const startupEnv: Record<string, string | undefined> = {
  APP_URL: "http://localhost:3000",
  OWNER_PIN: "4321",
  SESSION_SECRET: "test-session-secret-at-least-32-characters",
  SHOP_TOKEN: "test-shop-token-at-least-32-characters-long",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SECRET_KEY: "sb_secret_test",
  GEMINI_API_KEY: "test-gemini-key",
  GEMINI_MODEL: "gemini-3.8-flash",
  GEMINI_USE_VERTEX: "false",
  GOOGLE_CLOUD_API_KEY: undefined,
  SARVAM_API_KEY: "test-sarvam-key",
  SARVAM_STT_MODEL: "saaras:v4",
  SARVAM_TTS_MODEL: "bulbul:v3",
};

const paytmKeys = ["PAYTM_BASE_URL", "PAYTM_MID", "PAYTM_MERCHANT_KEY"];

// Every key is set explicitly, so values from the developer's shell never leak into a test.
function useEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries({ ...startupEnv, ...values })) {
    vi.stubEnv(key, value);
  }
}

function startupError(): EnvError {
  try {
    assertStartupEnv();
  } catch (error) {
    if (error instanceof EnvError) return error;
    throw error;
  }
  throw new Error("expected assertStartupEnv to throw");
}

describe("preview mode", () => {
  it("is on only when no service key is set", () => {
    useEnv({
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      SUPABASE_SECRET_KEY: undefined,
      GEMINI_API_KEY: undefined,
      SARVAM_API_KEY: undefined,
    });
    expect(isPreview()).toBe(true);
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");
    expect(isPreview()).toBe(false);
  });
});

describe("startup env", () => {
  it("accepts a complete env", () => {
    useEnv({});
    expect(() => assertStartupEnv()).not.toThrow();
  });

  it("names every missing key across services in one error", () => {
    useEnv({ SARVAM_API_KEY: undefined, GEMINI_MODEL: undefined });

    const error = startupError();

    expect(error.problems).toEqual([
      "Gemini: GEMINI_MODEL is missing",
      "Sarvam: SARVAM_API_KEY is missing",
    ]);
    expect(error.message).toContain("Copy apps/web/.env.example to apps/web/.env.local");
  });

  it("treats an empty value as missing", () => {
    useEnv({ SARVAM_API_KEY: "" });
    expect(startupError().problems).toEqual(["Sarvam: SARVAM_API_KEY is missing"]);
  });

  it("rejects swapped Supabase keys", () => {
    useEnv({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test",
      SUPABASE_SECRET_KEY: "sb_publishable_test",
    });
    expect(startupError().problems).toEqual([
      "Supabase: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must start with sb_publishable_",
      "Supabase: SUPABASE_SECRET_KEY must start with sb_secret_",
    ]);
  });

  it("rejects a URL without a scheme", () => {
    useEnv({ APP_URL: "localhost:3000" });
    expect(startupError().problems).toEqual(["App: APP_URL must be an http(s) URL"]);
  });
});

describe("paytm env", () => {
  it("is not needed to start the app", () => {
    useEnv(Object.fromEntries(paytmKeys.map((key) => [key, undefined])));
    expect(() => assertStartupEnv()).not.toThrow();
    expect(() => paytmEnv()).toThrow("Paytm: PAYTM_MID is missing");
  });

  it("rejects a merchant key that is not 16 characters", () => {
    useEnv({
      PAYTM_BASE_URL: "https://securestage.paytmpayments.com",
      PAYTM_MID: "TestMid12345678901",
      PAYTM_MERCHANT_KEY: "TestMid12345678901",
    });
    expect(() => paytmEnv()).toThrow(
      "Paytm: PAYTM_MERCHANT_KEY must be 16 characters (the merchant key, not the MID)",
    );
  });
});

describe("vertex switch", () => {
  it("uses the Gemini API key while the switch is off", () => {
    useEnv({});
    expect(geminiEnv()).toEqual({
      vertex: false,
      apiKey: "test-gemini-key",
      model: "gemini-3.8-flash",
    });
  });

  it("uses the Google Cloud key once the switch is on, without a Gemini key", () => {
    useEnv({
      GEMINI_USE_VERTEX: "true",
      GOOGLE_CLOUD_API_KEY: "test-cloud-key",
      GEMINI_API_KEY: undefined,
    });
    expect(geminiEnv()).toEqual({
      vertex: true,
      apiKey: "test-cloud-key",
      model: "gemini-3.8-flash",
    });
    expect(() => assertStartupEnv()).not.toThrow();
  });

  it("names the missing Google Cloud key when the switch is on", () => {
    useEnv({ GEMINI_USE_VERTEX: "true" });
    expect(startupError().problems).toEqual(["Vertex AI: GOOGLE_CLOUD_API_KEY is missing"]);
  });
});
