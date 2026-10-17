import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { substitutesFor, type Product } from "@/lib/catalog";
import type { Lang } from "@/lib/i18n/languages";
import { normalizeQuantity, type ProductUnit } from "@/lib/orders/quantity";
import { lineTotalPaise, orderTotalPaise } from "@/lib/orders/totals";

// A customer's cart is their one draft order. Every change to it goes through here, whether the
// agent, a tapped chip or the -/+ buttons asked for it, so the quantity rules apply once.

export type CartLine = {
  code: string;
  name: string;
  packSize: string | null;
  unit: ProductUnit;
  art: string;
  qty: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

export type Cart = { lines: CartLine[]; totalPaise: number };

export type CartChange =
  | { status: "added" | "updated"; product: Product; qty: number }
  | { status: "removed"; product: Product }
  | { status: "out_of_stock"; product: Product; substitutes: Product[] }
  | { status: "invalid_quantity"; product: Product; reason: string };

const idRow = z.object({ id: z.string() });
const qtyRow = z.object({ qty: z.coerce.number() });
const lineRow = z.object({
  qty: z.coerce.number(),
  unit_price_paise: z.number().int(),
  products: z.object({
    code: z.string(),
    name: z.string(),
    pack_size: z.string().nullable(),
    unit: z.enum(["kg", "litre", "pack", "piece"]),
    art: z.string(),
  }),
});

export async function findDraftId(db: SupabaseClient, customerId: string): Promise<string | null> {
  const { data, error } = await db
    .from("orders")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "draft")
    .maybeSingle();
  if (error) throw new Error(`Could not find the cart: ${error.message}`);
  return data ? idRow.parse(data).id : null;
}

/** The customer's draft order, created the first time they need one, in their language. */
export async function openDraft(
  db: SupabaseClient,
  shopId: string,
  customerId: string,
  lang: Lang,
): Promise<string> {
  const existing = await findDraftId(db, customerId);
  if (existing) {
    const { error } = await db.from("orders").update({ lang }).eq("id", existing);
    if (error) throw new Error(`Could not update the cart: ${error.message}`);
    return existing;
  }
  const { data, error } = await db
    .from("orders")
    .insert({ shop_id: shopId, customer_id: customerId, lang })
    .select("id")
    .single();
  if (!error) return idRow.parse(data).id;
  // Another request created it a moment ago: one draft per customer is a unique index.
  const raced = error.code === "23505" ? await findDraftId(db, customerId) : null;
  if (raced) return raced;
  throw new Error(`Could not start an order: ${error.message}`);
}

/** The lines and total of an order, worked out here from the stored prices. */
export async function readCart(db: SupabaseClient, orderId: string | null): Promise<Cart> {
  if (!orderId) return { lines: [], totalPaise: 0 };
  const { data, error } = await db
    .from("order_items")
    .select("qty, unit_price_paise, products(code, name, pack_size, unit, art)")
    .eq("order_id", orderId)
    .order("created_at");
  if (error) throw new Error(`Could not read the cart: ${error.message}`);
  const lines = z
    .array(lineRow)
    .parse(data)
    .map((row) => ({
      code: row.products.code,
      name: row.products.name,
      packSize: row.products.pack_size,
      unit: row.products.unit,
      art: row.products.art,
      qty: row.qty,
      unitPricePaise: row.unit_price_paise,
      lineTotalPaise: lineTotalPaise({ qty: row.qty, unitPricePaise: row.unit_price_paise }),
    }));
  return { lines, totalPaise: orderTotalPaise(lines) };
}

/** Adds to the order, or to the quantity already in it ("one more Maggi"). */
export async function addToCart(
  db: SupabaseClient,
  orderId: string,
  product: Product,
  qty: number,
  products: Product[],
): Promise<CartChange> {
  const current = await lineQty(db, orderId, product.id);
  if (current === 0 && product.stockQty <= 0) {
    return { status: "out_of_stock", product, substitutes: substitutesFor(product, products) };
  }
  return writeLine(db, orderId, product, current + qty, current === 0 ? "added" : "updated");
}

/** Sets the quantity ("make it three"); zero removes the line. */
export async function setCartQuantity(
  db: SupabaseClient,
  orderId: string,
  product: Product,
  qty: number,
  products: Product[],
): Promise<CartChange> {
  if (qty <= 0) return removeFromCart(db, orderId, product);
  const current = await lineQty(db, orderId, product.id);
  if (current === 0) return addToCart(db, orderId, product, qty, products);
  return writeLine(db, orderId, product, qty, "updated");
}

export async function removeFromCart(
  db: SupabaseClient,
  orderId: string,
  product: Product,
): Promise<CartChange> {
  const { error } = await db
    .from("order_items")
    .delete()
    .eq("order_id", orderId)
    .eq("product_id", product.id);
  if (error) throw new Error(`Could not remove ${product.code}: ${error.message}`);
  await clearReview(db, orderId);
  return { status: "removed", product };
}

/** The order was just read back to the customer, so a spoken "send it" may now submit it. */
export async function markReviewed(db: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await db
    .from("orders")
    .update({ reviewed_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "draft");
  if (error) throw new Error(`Could not mark the order read back: ${error.message}`);
}

/** A changed cart has not been read back yet (spec A5). */
async function clearReview(db: SupabaseClient, orderId: string): Promise<void> {
  const { error } = await db.from("orders").update({ reviewed_at: null }).eq("id", orderId);
  if (error) throw new Error(`Could not update the order: ${error.message}`);
}

async function lineQty(db: SupabaseClient, orderId: string, productId: string): Promise<number> {
  const { data, error } = await db
    .from("order_items")
    .select("qty")
    .eq("order_id", orderId)
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw new Error(`Could not read the cart: ${error.message}`);
  return data ? qtyRow.parse(data).qty : 0;
}

async function writeLine(
  db: SupabaseClient,
  orderId: string,
  product: Product,
  requested: number,
  status: "added" | "updated",
): Promise<CartChange> {
  const check = normalizeQuantity(product.unit, requested);
  if (!check.ok) return { status: "invalid_quantity", product, reason: check.reason };
  const { error } = await db.from("order_items").upsert(
    {
      order_id: orderId,
      product_id: product.id,
      qty: check.qty,
      unit_price_paise: product.pricePaise,
      price_source: product.priceSource,
    },
    { onConflict: "order_id,product_id" },
  );
  if (error) throw new Error(`Could not save ${product.code}: ${error.message}`);
  await clearReview(db, orderId);
  return { status, product, qty: check.qty };
}
