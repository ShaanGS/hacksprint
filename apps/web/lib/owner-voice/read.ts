import { FunctionCallingConfigMode, ThinkingLevel, type FunctionDeclaration } from "@google/genai";
import { matchCustomer } from "@/lib/credit/parse";
import { createGemini } from "@/lib/gemini/client";
import { wasSaid } from "@/lib/owner-voice/numbers";
import type { Named, ParsedEntry } from "@/lib/owner-voice/types";

// Gemini picks which of the four entries the owner meant and copies its words into it (spec
// section 14). It never computes: every number it returns must be one he said, or the entry is
// read by plain word matching instead.

const READ_TIMEOUT_MS = 8_000;

const credit = (what: string): FunctionDeclaration["parametersJsonSchema"] => ({
  type: "object",
  properties: {
    customer: {
      type: "string",
      description: "The customer, copied exactly from the list; empty if none fits",
    },
    amount_rupees: { type: "number", description: `The rupees ${what}, exactly as said` },
  },
  required: ["customer", "amount_rupees"],
});

const declarations: FunctionDeclaration[] = [
  {
    name: "credit_given",
    description: 'Goods given on credit to a customer, like "Ramesh, 200 on credit".',
    parametersJsonSchema: credit("given on credit"),
  },
  {
    name: "credit_repaid_cash",
    description: 'A customer paid back credit in cash, like "Meena paid 500".',
    parametersJsonSchema: credit("paid back"),
  },
  {
    name: "day_close",
    description:
      "Tonight's numbers: today's cash sales, and the money in hand (cash and bank together).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        cash_sales_rupees: { type: "number", description: "Today's cash sales, if said" },
        money_in_hand_rupees: { type: "number", description: "The money in hand now, if said" },
      },
    },
  },
  {
    name: "stock_count",
    description: 'He counted a product on the shelf, like "atta, 12 packs".',
    parametersJsonSchema: {
      type: "object",
      properties: {
        product_code: { type: "string", description: "A product code from the list" },
        quantity: { type: "number", description: "How many he counted, exactly as said" },
      },
      required: ["product_code", "quantity"],
    },
  },
];

function instructions(customers: Named[], products: (Named & { code: string })[]): string {
  return [
    "A kirana shop owner speaks Tamil, Hindi, Kannada or English, often mixed. Turn what he said",
    "into exactly one function call. Copy numbers exactly as he said them; never add, convert or",
    "work out a number. If he said no number, leave it out. If nothing fits, call no function.",
    "",
    "Customers:",
    ...customers.map((c) => `- ${c.name}`),
    "",
    "Products (code: name):",
    ...products.map((p) => `- ${p.code}: ${p.name}`),
  ].join("\n");
}

const said = (value: unknown, transcript: string): number | null =>
  typeof value === "number" && wasSaid(value, transcript) ? value : null;

/** The entry he meant, or null when the model found none or used a number he did not say. */
export async function readEntry(
  transcript: string,
  customers: Named[],
  products: (Named & { code: string })[],
): Promise<ParsedEntry | null> {
  const { ai, model } = createGemini();
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: transcript }] }],
    config: {
      systemInstruction: instructions(customers, products),
      tools: [{ functionDeclarations: declarations }],
      automaticFunctionCalling: { disable: true },
      toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: AbortSignal.timeout(READ_TIMEOUT_MS),
    },
  });
  const call = response.functionCalls?.[0];
  if (!call?.name) return null;
  const args = call.args ?? {};
  if (call.name === "credit_given" || call.name === "credit_repaid_cash") {
    const amount = said(args.amount_rupees, transcript);
    if (amount === null) return null;
    const name = typeof args.customer === "string" ? args.customer : "";
    const exact = customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    return {
      kind: call.name,
      customerId: exact?.id ?? (name ? matchCustomer(name, customers) : null),
      amountPaise: Math.round(amount * 100),
    };
  }
  if (call.name === "day_close") {
    const cash =
      args.cash_sales_rupees === undefined ? null : said(args.cash_sales_rupees, transcript);
    const hand =
      args.money_in_hand_rupees === undefined ? null : said(args.money_in_hand_rupees, transcript);
    if (
      (args.cash_sales_rupees !== undefined && cash === null) ||
      (args.money_in_hand_rupees !== undefined && hand === null)
    ) {
      return null;
    }
    return {
      kind: "day_close",
      cashSalesPaise: cash === null ? null : Math.round(cash * 100),
      moneyInHandPaise: hand === null ? null : Math.round(hand * 100),
    };
  }
  if (call.name === "stock_count") {
    const qty = said(args.quantity, transcript);
    if (qty === null) return null;
    const product = products.find((p) => p.code === args.product_code);
    return { kind: "stock_count", productId: product?.id ?? null, qty };
  }
  return null;
}
