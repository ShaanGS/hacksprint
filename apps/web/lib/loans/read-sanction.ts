import { ThinkingLevel } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { createGemini } from "@/lib/gemini/client";
import { HttpError } from "@/lib/http";
import type { Shop } from "@/lib/shop";

// Reading the bank's sanction letter for the loan tracker, so the owner photographs it instead of
// typing. The model copies the three printed figures and never works one out (guardrail 1); he
// checks them on screen and taps Save, and only then is anything stored.

const READ_TIMEOUT_MS = 30_000;

const reading = z.object({
  sanctionedRupees: z.number().positive().nullable().catch(null),
  emiRupees: z.number().positive().nullable().catch(null),
  tenureMonths: z.number().int().min(1).max(120).nullable().catch(null),
});

const nullableNumber = { type: ["number", "null"] };

// The same shape for structured output; Zod above is still what we trust.
const responseSchema = {
  type: "object",
  properties: {
    sanctionedRupees: { ...nullableNumber, description: "The loan amount sanctioned, in rupees" },
    emiRupees: { ...nullableNumber, description: "The monthly EMI or instalment, in rupees" },
    tenureMonths: { ...nullableNumber, description: "The repayment period, in months" },
  },
  required: ["sanctionedRupees", "emiRupees", "tenureMonths"],
};

const INSTRUCTIONS = [
  "This is a photo of a bank's loan sanction letter to a small shop owner in India.",
  "Copy three figures exactly as printed: the sanctioned loan amount in rupees, the monthly EMI",
  "(instalment) in rupees, and the repayment period in months (convert years to months only",
  "when the letter prints years).",
  "Never calculate, estimate or guess a figure. If one is not printed or cannot be read, give",
  "null for it. Ignore interest rates, fees and account numbers.",
].join("\n");

const toPaise = (rupees: number | null) => (rupees === null ? null : Math.round(rupees * 100));

/** The letter's figures for the owner to check; null where the letter did not show one. */
export async function readSanctionLetter(
  db: SupabaseClient,
  shop: Shop,
  loanId: string,
  photo: Blob,
) {
  const { data, error } = await db
    .from("loans")
    .select("id")
    .eq("id", loanId)
    .eq("shop_id", shop.id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the loan: ${error.message}`);
  if (!data) throw new HttpError(404, "No such loan.");

  const { ai, model } = createGemini();
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: photo.type,
              data: Buffer.from(await photo.arrayBuffer()).toString("base64"),
            },
          },
          { text: INSTRUCTIONS },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: responseSchema,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      httpOptions: { timeout: READ_TIMEOUT_MS },
      abortSignal: AbortSignal.timeout(READ_TIMEOUT_MS),
    },
  });
  const letter = reading.parse(JSON.parse(response.text ?? "{}"));
  await audit(db, shop.id, [
    {
      actor: "agent",
      action: "loan.letter_read",
      entityType: "loan",
      entityId: loanId,
      payload: letter,
    },
  ]);
  return {
    sanctioned_paise: toPaise(letter.sanctionedRupees),
    emi_paise: toPaise(letter.emiRupees),
    tenure_months: letter.tenureMonths,
  };
}

export type SanctionLetter = Awaited<ReturnType<typeof readSanctionLetter>>;
