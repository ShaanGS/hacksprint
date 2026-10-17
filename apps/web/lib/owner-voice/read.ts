import { FunctionCallingConfigMode, ThinkingLevel, type FunctionDeclaration } from "@google/genai";
import { matchCustomer } from "@/lib/credit/parse";
import { createGemini } from "@/lib/gemini/client";
import { wasSaid } from "@/lib/owner-voice/numbers";
import {
  questionTopics,
  type Named,
  type ParsedEntry,
  type Question,
} from "@/lib/owner-voice/types";

// Gemini picks which of the four entries the owner meant and copies its words into it (spec
// section 14), or which question about his money he asked. It never computes: every number it
// returns must be one he said, or the entry is read by plain word matching instead.

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
    name: "ask_question",
    description:
      "He asks about his own money instead of telling an entry: can he pay this week's bills, who to collect from, how much one customer owes, his stock, what he owes suppliers, or does he need a loan. Or he hands the agent a job: to collect from the late payers for him, or to order what is running low.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [...questionTopics],
          description:
            'week: can he pay this week, is he short. collect: who to collect from, who is late (he wants to know). customer: how much one customer owes. stock: his shelf, what is low or stuck. dues: what he owes suppliers, which bill is due. loan: does he need a loan, how much. collect_agent: he wants it done for him, the late payers reminded and the money collected ("collect from the late payers", "கடன் வசூல் பண்ணு", "paisa wasool karo"). reorder: he wants what is running low ordered from his distributor ("order what\'s running low", "சரக்கு ஆர்டர் போடு", "maal mangwao").',
        },
        customer: {
          type: "string",
          description: "For a question about one customer, the name copied exactly from the list",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "price_items",
    description:
      'Someone wants items: he lists items and quantities a customer asks for, to know what they cost, like "I want 2 kg tomatoes, 1 Maggi and 3 kg rice", "எனக்கு ரெண்டு கிலோ தக்காளி வேணும்" or "do kilo chawal chahiye". "வேணும்", "want", "give me" and "chahiye" mean this. Use it even for items the shop may not sell.',
    parametersJsonSchema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string", description: "The item as he said it" },
              product_code: {
                type: "string",
                description:
                  "The product code from the list, or empty if the shop does not sell it",
              },
              quantity: { type: "number", description: "How many he said, exactly as said" },
            },
            required: ["item", "product_code", "quantity"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "stock_count",
    description:
      'He says how many of one product he counted on his own shelf, like "atta, 12 packs" or "ஆட்டா பன்னிரண்டு பாக்கெட் இருக்கு". Never when someone wants or asks for items.',
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
    "into exactly one function call: an entry he is telling you, or a question about his money.",
    "Copy numbers exactly as he said them; never add, convert or work out a number. If he said",
    "no number, leave it out. If nothing fits, call no function.",
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

function customerOf(name: unknown, customers: Named[]): string | null {
  const said = typeof name === "string" ? name.trim() : "";
  if (!said) return null;
  return (
    customers.find((c) => c.name.toLowerCase() === said.toLowerCase())?.id ??
    matchCustomer(said, customers)
  );
}

/**
 * The entry he meant or the question he asked, or null when the model found neither or used a
 * number he did not say.
 */
export async function readEntry(
  transcript: string,
  customers: Named[],
  products: (Named & { code: string })[],
): Promise<ParsedEntry | Question | null> {
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
    return {
      kind: call.name,
      customerId: customerOf(args.customer, customers),
      amountPaise: Math.round(amount * 100),
    };
  }
  if (call.name === "ask_question") {
    const topic = questionTopics.find((t) => t === args.topic);
    if (!topic) return null;
    return {
      kind: "question",
      topic,
      customerId: customerOf(args.customer, customers),
      items: [],
      missing: [],
    };
  }
  if (call.name === "price_items") {
    const lines = (Array.isArray(args.items) ? args.items : []).map(
      (item: unknown) => item as { item?: unknown; product_code?: unknown; quantity?: unknown },
    );
    const items = lines.flatMap((line) => {
      const product = products.find((p) => p.code === line.product_code);
      const qty = said(line.quantity, transcript);
      return product && qty !== null && qty > 0 ? [{ productId: product.id, qty }] : [];
    });
    const missing = lines.flatMap((line) =>
      products.some((p) => p.code === line.product_code) || typeof line.item !== "string"
        ? []
        : [line.item],
    );
    return items.length + missing.length > 0
      ? { kind: "question", topic: "items", customerId: null, items, missing }
      : null;
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
