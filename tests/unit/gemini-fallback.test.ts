import { ApiError, type GenerateContentResponse } from "@google/genai";
import { describe, expect, it } from "vitest";
import { withFallback, type Gemini } from "@/lib/gemini/client";

const answer = { text: "ok" } as GenerateContentResponse;
const params = { model: "m", contents: "hi" };

const failing = (status: number): Gemini => ({
  models: {
    generateContent: async () => {
      throw new ApiError({ message: "no", status });
    },
  },
});
const working = (calls: string[], name: string): Gemini => ({
  models: {
    generateContent: async () => {
      calls.push(name);
      return answer;
    },
  },
});

describe("withFallback", () => {
  it("uses the first key while it works", async () => {
    const calls: string[] = [];
    await withFallback(working(calls, "first"), working(calls, "second")).models.generateContent(
      params,
    );
    expect(calls).toEqual(["first"]);
  });

  it("asks the second key when the first is rate-limited, refused or Gemini is busy", async () => {
    for (const status of [429, 403, 401, 503]) {
      const calls: string[] = [];
      const result = await withFallback(
        failing(status),
        working(calls, "second"),
      ).models.generateContent(params);
      expect(result).toBe(answer);
      expect(calls).toEqual(["second"]);
    }
  });

  it("does not retry other failures, such as a bad request or a timeout", async () => {
    const calls: string[] = [];
    await expect(
      withFallback(failing(400), working(calls, "second")).models.generateContent(params),
    ).rejects.toThrow();
    const timeout: Gemini = {
      models: {
        generateContent: async () => {
          throw new DOMException("The operation timed out.", "TimeoutError");
        },
      },
    };
    await expect(
      withFallback(timeout, working(calls, "second")).models.generateContent(params),
    ).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
