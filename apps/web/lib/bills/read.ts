import { ThinkingLevel } from "@google/genai";
import { z } from "zod";
import type { Product } from "@/lib/catalog";
import { createGemini } from "@/lib/gemini/client";

// Reading a bill photo (spec B1). The model copies what is printed, line by line, and says which
// of our products each line is; it never works a number out. Code checks every line afterwards,
// and the owner confirms before anything changes.

// A photo takes longer than a voice turn; the owner is watching a "reading the bill" screen.
const READ_TIMEOUT_MS = 30_000;
const MAX_LINES = 60;

const rupees = z.number().nonnegative().nullable();

export const billReading = z.object({
  distributor: z.string(),
  billNumber: z.string().nullable(),
  totalRupees: rupees,
  lines: z
    .array(
      z.object({
        printedName: z.string().min(1),
        code: z.string().nullable(),
        qty: z.number().positive().nullable(),
        unitCostRupees: z.number().positive().nullable(),
        mrpRupees: z.number().positive().nullable(),
        lineTotalRupees: rupees,
      }),
    )
    .max(MAX_LINES),
});

export type BillReading = z.infer<typeof billReading>;

const nullableNumber = { type: ["number", "null"] };
const nullableString = { type: ["string", "null"] };

// The same shape for Gemini's structured output; Zod above is still what we trust.
const responseSchema = {
  type: "object",
  properties: {
    distributor: { type: "string", description: "The seller's name printed at the top" },
    billNumber: { ...nullableString, description: "The bill or invoice number" },
    totalRupees: { ...nullableNumber, description: "The bill total as printed" },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          printedName: { type: "string", description: "The item as printed" },
          code: { ...nullableString, description: "Our product code, or null if none fits" },
          qty: { ...nullableNumber, description: "The quantity column" },
          unitCostRupees: { ...nullableNumber, description: "The rate per unit, not the MRP" },
          mrpRupees: { ...nullableNumber, description: "The MRP column, if there is one" },
          lineTotalRupees: { ...nullableNumber, description: "The amount column" },
        },
        required: ["printedName", "code", "qty", "unitCostRupees", "mrpRupees", "lineTotalRupees"],
      },
    },
  },
  required: ["distributor", "billNumber", "totalRupees", "lines"],
};

function instructions(products: Product[]): string {
  const catalog = products
    .map((p) => `${p.code}: ${p.name}${p.packSize ? ` ${p.packSize}` : ""} (sold per ${p.unit})`)
    .join("\n");
  return [
    "This is a photo of a printed delivery bill from a distributor to a small grocery shop.",
    "Copy every item line exactly as printed, top to bottom.",
    "Copy numbers as printed, in rupees. Never calculate, correct or guess a number: if one",
    "cannot be read, give null for it.",
    "For each line, code is the shop product below that is the same item (same brand and pack),",
    "or null if none clearly is.",
    "",
    "Shop products:",
    catalog,
  ].join("\n");
}

/** The bill's lines as printed, checked against our schema. Throws if the photo cannot be read. */
export async function readBillPhoto(
  photo: Uint8Array,
  mimeType: string,
  products: Product[],
): Promise<BillReading> {
  const { ai, model } = createGemini();
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: Buffer.from(photo).toString("base64") } },
          { text: instructions(products) },
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
  return billReading.parse(JSON.parse(response.text ?? ""));
}
