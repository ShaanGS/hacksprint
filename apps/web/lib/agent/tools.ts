import type { FunctionDeclaration } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Product } from "@/lib/catalog";
import { addToCart, removeFromCart, setCartQuantity, type CartChange } from "@/lib/orders/cart";
import type { Choice } from "@/lib/voice/turns";

const code = { type: "string", description: "A product code from the list" };
const qty = {
  type: "number",
  description: "Packs or pieces, or kilos or litres (0.5 is half a kilo)",
};

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "add_item",
    description: "Adds a product to the order. If it is already there, adds to its quantity.",
    parametersJsonSchema: { type: "object", properties: { code, qty }, required: ["code", "qty"] },
  },
  {
    name: "set_quantity",
    description: "Changes how much of a product is in the order. 0 takes it out.",
    parametersJsonSchema: { type: "object", properties: { code, qty }, required: ["code", "qty"] },
  },
  {
    name: "remove_item",
    description: "Takes a product out of the order.",
    parametersJsonSchema: { type: "object", properties: { code }, required: ["code"] },
  },
  {
    name: "find_products",
    description:
      "Searches the shop's products by what the customer called them, in any language or spelling, and says whether each is in stock.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: 'What the customer said, like "oil" or "நல்லெண்ணெய்"',
        },
        qty: { ...qty, description: "How much the customer wants, if they said" },
      },
      required: ["query"],
    },
  },
  {
    name: "open_review",
    description:
      "Shows the customer their whole order and total, to check and send. Call it when they say that is all or ask for the total.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
];

export type ToolContext = {
  db: SupabaseClient;
  shopId: string;
  orderId: string;
  products: Product[];
};

export type ToolOutcome = {
  /** What the model is told: names, quantities and in or out of stock. Never a price or count. */
  response: Record<string, unknown>;
  /** Answers the customer can tap. */
  choices: Choice[];
  /** The product this call put in the order or changed, so it is not offered again. */
  changedCode?: string;
  review?: boolean;
};

const itemArgs = z.object({ code: z.string(), qty: z.number() });
const codeArgs = z.object({ code: z.string() });
const searchArgs = z.object({ query: z.string().min(1), qty: z.number().positive().optional() });
const searchRow = z.object({ product_id: z.string() });

/** Runs one tool call from the model. The arguments are the model's, so they are checked first. */
export async function runTool(ctx: ToolContext, name: string, args: unknown): Promise<ToolOutcome> {
  if (name === "add_item" || name === "set_quantity") {
    const parsed = itemArgs.safeParse(args);
    if (!parsed.success) return told({ error: "add_item and set_quantity need code and qty" });
    const product = ctx.products.find((p) => p.code === parsed.data.code);
    if (!product) return told({ result: "unknown_code", hint: "call find_products" });
    const change =
      name === "add_item"
        ? await addToCart(ctx.db, ctx.orderId, product, parsed.data.qty, ctx.products)
        : await setCartQuantity(ctx.db, ctx.orderId, product, parsed.data.qty, ctx.products);
    return fromChange(change, parsed.data.qty);
  }
  if (name === "remove_item") {
    const parsed = codeArgs.safeParse(args);
    const product = parsed.success && ctx.products.find((p) => p.code === parsed.data.code);
    if (!product) return told({ result: "unknown_code" });
    return fromChange(await removeFromCart(ctx.db, ctx.orderId, product), 0);
  }
  if (name === "find_products") return findProducts(ctx, args);
  if (name === "open_review")
    return { response: { result: "review_shown" }, choices: [], review: true };
  return told({ error: `there is no tool called ${name}` });
}

function told(response: Record<string, unknown>): ToolOutcome {
  return { response, choices: [] };
}

function fromChange(change: CartChange, requestedQty: number): ToolOutcome {
  const product = change.product.name;
  switch (change.status) {
    case "added":
    case "updated":
      return {
        response: { result: change.status, product, qty_in_order: change.qty },
        choices: [],
        changedCode: change.product.code,
      };
    case "removed":
      return {
        response: { result: "removed", product },
        choices: [],
        changedCode: change.product.code,
      };
    case "invalid_quantity":
      return told({ result: "invalid_quantity", product, reason: change.reason });
    case "out_of_stock":
      return {
        response: {
          result: "out_of_stock",
          product,
          substitutes: change.substitutes.map((p) => ({ code: p.code, name: p.name })),
        },
        choices: change.substitutes.map((p) => ({
          label: p.name,
          code: p.code,
          qty: requestedQty,
        })),
      };
  }
}

async function findProducts(ctx: ToolContext, args: unknown): Promise<ToolOutcome> {
  const parsed = searchArgs.safeParse(args);
  if (!parsed.success) return told({ error: "find_products needs a query" });
  const { data, error } = await ctx.db.rpc("search_products", {
    p_shop_id: ctx.shopId,
    p_query: parsed.data.query,
    p_limit: 3,
  });
  if (error) throw new Error(`Product search failed: ${error.message}`);
  const found = z
    .array(searchRow)
    .parse(data)
    .flatMap((row) => ctx.products.filter((p) => p.id === row.product_id));
  const wanted = parsed.data.qty ?? 1;
  return {
    response: {
      matches: found.map((p) => ({ code: p.code, name: p.name, in_stock: p.stockQty > 0 })),
    },
    choices: found
      .filter((p) => p.stockQty > 0)
      .map((p) => ({ label: p.name, code: p.code, qty: wanted })),
  };
}
