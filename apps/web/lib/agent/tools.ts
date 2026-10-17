import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { choiceFor, itemFor } from "@/lib/agent/cards";
import { substitutesFor, type Product } from "@/lib/catalog";
import {
  addToCart,
  markReviewed,
  readCart,
  removeFromCart,
  setCartQuantity,
  type CartChange,
} from "@/lib/orders/cart";
import { submitOrder } from "@/lib/orders/submit";
import { usualBasket } from "@/lib/orders/usual";
import type { Choice, TurnItem } from "@/lib/voice/turns";

export type ToolContext = {
  db: SupabaseClient;
  shopId: string;
  orderId: string;
  customerId: string;
  products: Product[];
};

export type ToolOutcome = {
  /** What the model is told: names, quantities and in or out of stock. Never a price or count. */
  response: Record<string, unknown>;
  /** Answers the customer can tap. */
  choices: Choice[];
  /** Product cards to show with the reply. */
  items: TurnItem[];
  /** The product this call put in the order or changed, so it is not offered again. */
  changedCode?: string;
  /** The order was read back: open the review. */
  review?: boolean;
  /** The order went to the shop: its number. */
  sent?: number;
};

const itemArgs = z.object({ code: z.string(), qty: z.number() });
const codeArgs = z.object({ code: z.string() });
const searchArgs = z.object({ query: z.string().min(1), qty: z.number().positive().optional() });
const submitArgs = z.object({ payment_mode: z.enum(["link", "credit"]).optional() });
const searchRow = z.object({ product_id: z.string() });
const reviewedRow = z.object({ reviewed_at: z.string().nullable() });

/** Runs one tool call from the model. The arguments are the model's, so they are checked first. */
export async function runTool(ctx: ToolContext, name: string, args: unknown): Promise<ToolOutcome> {
  if (name === "add_item" || name === "set_quantity") {
    const parsed = itemArgs.safeParse(args);
    if (!parsed.success) return told({ error: "add_item and set_quantity need code and qty" });
    const product = byCode(ctx, parsed.data.code);
    if (!product) return told({ result: "unknown_code", hint: "call search_products" });
    const change =
      name === "add_item"
        ? await addToCart(ctx.db, ctx.orderId, product, parsed.data.qty, ctx.products)
        : await setCartQuantity(ctx.db, ctx.orderId, product, parsed.data.qty, ctx.products);
    return fromChange(change, parsed.data.qty);
  }
  if (name === "remove_item") {
    const parsed = codeArgs.safeParse(args);
    const product = parsed.success ? byCode(ctx, parsed.data.code) : undefined;
    if (!product) return told({ result: "unknown_code" });
    return fromChange(await removeFromCart(ctx.db, ctx.orderId, product), 0);
  }
  if (name === "check_stock") return checkStock(ctx, args);
  if (name === "search_products") return searchProducts(ctx, args);
  if (name === "get_usual_order") return addUsual(ctx);
  if (name === "get_order_summary") {
    await markReviewed(ctx.db, ctx.orderId);
    return { response: { result: "read_back_shown" }, choices: [], items: [], review: true };
  }
  if (name === "submit_order") return submit(ctx, args);
  return told({ error: `there is no tool called ${name}` });
}

function told(response: Record<string, unknown>): ToolOutcome {
  return { response, choices: [], items: [] };
}

function byCode(ctx: ToolContext, code: string): Product | undefined {
  return ctx.products.find((p) => p.code === code);
}

function fromChange(change: CartChange, requestedQty: number): ToolOutcome {
  const product = change.product.name;
  switch (change.status) {
    case "added":
    case "updated":
      return {
        response: { result: change.status, product, qty_in_order: change.qty },
        choices: [],
        items: [itemFor(change.product, change.qty, "added")],
        changedCode: change.product.code,
      };
    case "removed":
      return {
        response: { result: "removed", product },
        choices: [],
        items: [],
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
        choices: change.substitutes.map((p) => choiceFor(p, requestedQty)),
        items: [itemFor(change.product, requestedQty, "out_of_stock")],
      };
  }
}

function checkStock(ctx: ToolContext, args: unknown): ToolOutcome {
  const parsed = codeArgs.safeParse(args);
  const product = parsed.success ? byCode(ctx, parsed.data.code) : undefined;
  if (!product) return told({ result: "unknown_code", hint: "call search_products" });
  if (product.stockQty > 0) {
    return {
      response: { product: product.name, in_stock: true },
      choices: [choiceFor(product, 1)],
      items: [],
    };
  }
  const substitutes = substitutesFor(product, ctx.products);
  return {
    response: {
      product: product.name,
      in_stock: false,
      substitutes: substitutes.map((p) => ({ code: p.code, name: p.name })),
    },
    choices: substitutes.map((p) => choiceFor(p, 1)),
    items: [itemFor(product, 1, "out_of_stock")],
  };
}

async function searchProducts(ctx: ToolContext, args: unknown): Promise<ToolOutcome> {
  const parsed = searchArgs.safeParse(args);
  if (!parsed.success) return told({ error: "search_products needs a query" });
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
    choices: found.filter((p) => p.stockQty > 0).map((p) => choiceFor(p, wanted)),
    items: [],
  };
}

// The usual goes straight into the order rather than back to the model to add line by line:
// one model call fewer on the path a regular uses most.
async function addUsual(ctx: ToolContext): Promise<ToolOutcome> {
  const usual = await usualBasket(ctx.db, ctx.customerId);
  if (usual.length === 0) return told({ result: "no_usual_order" });
  const outcomes: ToolOutcome[] = [];
  for (const line of usual) {
    const product = ctx.products.find((p) => p.id === line.productId);
    if (!product) continue;
    outcomes.push(
      fromChange(await addToCart(ctx.db, ctx.orderId, product, line.qty, ctx.products), line.qty),
    );
  }
  return {
    response: { result: "usual_order", lines: outcomes.map((o) => o.response) },
    choices: outcomes.flatMap((o) => o.choices),
    items: outcomes.flatMap((o) => o.items),
  };
}

async function submit(ctx: ToolContext, args: unknown): Promise<ToolOutcome> {
  const parsed = submitArgs.safeParse(args);
  const { data, error } = await ctx.db
    .from("orders")
    .select("reviewed_at")
    .eq("id", ctx.orderId)
    .single();
  if (error) throw new Error(`Could not read the order: ${error.message}`);
  // Spec A5: the customer hears the items and total before anything is sent.
  if (!reviewedRow.parse(data).reviewed_at) {
    return told({ result: "not_read_back", hint: "call get_order_summary first" });
  }
  if ((await readCart(ctx.db, ctx.orderId)).lines.length === 0) return told({ result: "empty" });
  const mode = parsed.success ? (parsed.data.payment_mode ?? "link") : "link";
  const result = await submitOrder(ctx.db, ctx.orderId, mode);
  if (!result.ok) return told({ result: result.reason });
  return { response: { result: "sent" }, choices: [], items: [], sent: result.number };
}
