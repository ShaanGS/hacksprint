import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ShopReceipt } from "@/lib/rotation/load";

// The approved festival order (spec C3, 9.14, D4): what the loan is for and the pack's stock
// quotation. Its prices come from bills: its own bill once delivered, else each product's
// latest bill cost.

export type FestivalLine = {
  productId: string;
  name: string;
  qty: number;
  unitCostPaise: number;
  linePaise: number;
};

export type FestivalOrder = {
  id: string;
  festival: string;
  distributor: string;
  billNumber: string | null;
  lines: FestivalLine[];
  totalPaise: number;
  /** The order's bill as a payable, left out of the week for "gap without the order". */
  payableId: string | null;
};

const orderRow = z.object({
  id: z.string(),
  festival: z.string(),
  distributors: z.object({ name: z.string() }),
  purchase_order_items: z.array(
    z.object({
      qty_ordered: z.coerce.number(),
      products: z.object({ id: z.string(), name: z.string() }),
    }),
  ),
});
const billRow = z.object({
  bill_number: z.string().nullable(),
  bill_items: z.array(
    z.object({
      product_id: z.string(),
      qty: z.coerce.number(),
      unit_cost_paise: z.number().int(),
      line_total_paise: z.number().int(),
    }),
  ),
  // A bill has one payable; PostgREST returns it as an object or a list depending on version.
  payables: z.union([
    z.array(z.object({ id: z.string() })),
    z.object({ id: z.string() }),
    z.null(),
  ]),
});

function payableIdOf(bill: z.infer<typeof billRow> | null): string | null {
  if (!bill?.payables) return null;
  return Array.isArray(bill.payables) ? (bill.payables[0]?.id ?? null) : bill.payables.id;
}

/** The latest approved festival order, or the one a loan check was for when `orderId` is given. */
export async function loadFestivalOrder(
  db: SupabaseClient,
  shopId: string,
  receipts: ShopReceipt[],
  orderId?: string,
): Promise<FestivalOrder | null> {
  const query = db
    .from("purchase_orders")
    .select(
      "id, festival, distributors(name), purchase_order_items(qty_ordered, products(id, name))",
    )
    .eq("shop_id", shopId)
    .not("festival", "is", null)
    .not("approved_at", "is", null);
  const { data, error } = await (orderId ? query.eq("id", orderId) : query)
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not read the festival order: ${error.message}`);
  if (!data) return null;
  const order = orderRow.parse(data);

  const billed = await db
    .from("bills")
    .select(
      "bill_number, bill_items(product_id, qty, unit_cost_paise, line_total_paise), payables(id)",
    )
    .eq("purchase_order_id", order.id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (billed.error)
    throw new Error(`Could not read the festival order's bill: ${billed.error.message}`);
  const bill = billed.data ? billRow.parse(billed.data) : null;
  const names = new Map(
    order.purchase_order_items.map((item) => [item.products.id, item.products.name]),
  );

  const lines: FestivalLine[] = bill
    ? bill.bill_items.map((line) => ({
        productId: line.product_id,
        name: names.get(line.product_id) ?? "",
        qty: line.qty,
        unitCostPaise: line.unit_cost_paise,
        linePaise: line.line_total_paise,
      }))
    : order.purchase_order_items.map((item) => {
        const latest = receipts
          .filter((r) => r.productId === item.products.id)
          .sort((a, b) => b.at.localeCompare(a.at))[0];
        const unitCostPaise = latest?.unitCostPaise ?? 0;
        return {
          productId: item.products.id,
          name: item.products.name,
          qty: item.qty_ordered,
          unitCostPaise,
          linePaise: Math.round(item.qty_ordered * unitCostPaise),
        };
      });
  return {
    id: order.id,
    festival: order.festival,
    distributor: order.distributors.name,
    billNumber: bill?.bill_number ?? null,
    lines,
    totalPaise: lines.reduce((sum, line) => sum + line.linePaise, 0),
    payableId: payableIdOf(bill),
  };
}
