import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { risePercent } from "@/lib/bills/match";
import type { BillIssue, BillOutcome, ConfirmLine } from "@/lib/bills/types";
import { loadCatalog } from "@/lib/catalog";
import { loadDistributors } from "@/lib/distributors";
import { HttpError } from "@/lib/http";
import { lineTotalPaise } from "@/lib/orders/totals";
import { broadcastChanged } from "@/lib/realtime";
import type { Shop } from "@/lib/shop";

// The owner's yes to a bill (spec B2 to B4). confirm_bill does everything in one transaction:
// stock, prices from the MRP, the payable, the delivery check and price rises. This side checks
// the lines first and turns the result into what the owner reads.

const issueRow = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("missing"),
    product_id: z.string(),
    name: z.string(),
    ordered: z.coerce.number(),
  }),
  z.object({
    type: z.literal("qty_mismatch"),
    product_id: z.string(),
    name: z.string(),
    ordered: z.coerce.number(),
    received: z.coerce.number(),
  }),
  z.object({
    type: z.literal("price_up"),
    product_id: z.string(),
    name: z.string(),
    old_cost_paise: z.number().int(),
    new_cost_paise: z.number().int(),
  }),
]);

function toIssue(row: z.infer<typeof issueRow>): BillIssue {
  switch (row.type) {
    case "missing":
      return { type: "missing", productId: row.product_id, name: row.name, ordered: row.ordered };
    case "qty_mismatch":
      return {
        type: "qty_mismatch",
        productId: row.product_id,
        name: row.name,
        ordered: row.ordered,
        received: row.received,
      };
    case "price_up":
      return {
        type: "price_up",
        productId: row.product_id,
        name: row.name,
        oldCostPaise: row.old_cost_paise,
        newCostPaise: row.new_cost_paise,
        percent: risePercent(row.old_cost_paise, row.new_cost_paise),
      };
  }
}

export async function confirmBill(
  db: SupabaseClient,
  shop: Shop,
  billId: string,
  input: { distributorId: string; dueDate: string | null; lines: ConfirmLine[] },
): Promise<BillOutcome> {
  const [products, distributors] = await Promise.all([
    loadCatalog(db, shop.id),
    loadDistributors(db, shop.id),
  ]);
  if (!distributors.some((d) => d.id === input.distributorId)) {
    throw new HttpError(400, "Pick the distributor.");
  }
  if (input.lines.some((line) => !products.some((p) => p.id === line.productId))) {
    throw new HttpError(400, "A line is not one of the shop's products.");
  }

  const { data, error } = await db.rpc("confirm_bill", {
    p_bill_id: billId,
    p_distributor_id: input.distributorId,
    p_due_date: input.dueDate,
    p_lines: input.lines.map((line) => ({
      product_id: line.productId,
      qty: line.qty,
      unit_cost_paise: line.unitCostPaise,
      mrp_paise: line.mrpPaise,
    })),
  });
  if (error?.code === "23505") throw new HttpError(409, "This bill was already added.");
  if (error?.message.includes("not waiting for confirmation")) {
    throw new HttpError(409, "This bill was already confirmed.");
  }
  if (error) throw new Error(`Could not confirm the bill: ${error.message}`);
  const issues = z.array(issueRow).parse(data).map(toIssue);
  const payable = await db.from("payables").select("due_date").eq("bill_id", billId).maybeSingle();
  if (payable.error)
    throw new Error(`Could not read the bill's due date: ${payable.error.message}`);
  await broadcastChanged(db, shop.id, ["stock", "rotation"]);

  // Stock as it is now, after the bill, for the "stock updated" list.
  const after = await loadCatalog(db, shop.id);
  const stock = input.lines.map((line) => {
    const product = after.find((p) => p.id === line.productId);
    return {
      productId: line.productId,
      name: product?.name ?? "",
      art: product?.art ?? "bag",
      unit: product?.unit ?? "pack",
      added: line.qty,
      nowQty: product?.stockQty ?? 0,
    };
  });
  const totalPaise = input.lines.reduce(
    (total, line) => total + lineTotalPaise({ qty: line.qty, unitPricePaise: line.unitCostPaise }),
    0,
  );
  const dueDate =
    z.object({ due_date: z.string() }).nullable().parse(payable.data)?.due_date ?? null;
  return { totalPaise, dueDate, stock, issues };
}
