import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { stockOrderPaymentLink } from "@/lib/payments";
import { loadShopData } from "@/lib/rotation/load";
import { lastBillLine, linePaise, linesTotalPaise } from "@/lib/rotation/reorder";
import type { Shop } from "@/lib/shop";

// Paying a sent stock order through a Paytm test checkout (decision of Oct 17, rule 8's labelled
// test-mode exception). The amount is the order at its last bill prices, worked out here; asking
// again gives the same link.

const orderRow = z.object({
  id: z.string(),
  status: z.string(),
  purchase_order_items: z.array(
    z.object({ product_id: z.string(), qty_ordered: z.coerce.number() }),
  ),
});
const paymentRow = z.object({
  id: z.string(),
  link_url: z.string(),
  status: z.string(),
  amount_paise: z.number().int(),
});

export async function payStockOrder(db: SupabaseClient, shop: Shop, orderId: string) {
  const { data, error } = await db
    .from("purchase_orders")
    .select("id, status, purchase_order_items(product_id, qty_ordered)")
    .eq("id", orderId)
    .eq("shop_id", shop.id)
    .is("festival", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read the order: ${error.message}`);
  if (!data) throw new HttpError(404, "No such order.");
  const order = orderRow.parse(data);
  if (order.status === "draft") throw new HttpError(409, "This order was not sent.");

  const existing = await db
    .from("payments")
    .select("id, link_url, status, amount_paise")
    .eq("purchase_order_id", order.id)
    .in("status", ["created", "paid"])
    .maybeSingle();
  if (existing.error) throw new Error(`Could not read payments: ${existing.error.message}`);
  if (existing.data) {
    const payment = paymentRow.parse(existing.data);
    return {
      payment_id: payment.id,
      url: payment.link_url,
      amount_paise: payment.amount_paise,
      paid: payment.status === "paid",
    };
  }

  const { receipts } = await loadShopData(db, shop.id);
  const amountPaise = linesTotalPaise(
    order.purchase_order_items.map((item) => ({
      linePaise: linePaise(
        item.qty_ordered,
        lastBillLine(item.product_id, receipts)?.unitCostPaise ?? 0,
      ),
    })),
  );
  if (amountPaise <= 0) throw new HttpError(409, "This order has no bill prices to pay by.");
  const link = await stockOrderPaymentLink(db, shop, { purchaseOrderId: order.id, amountPaise });
  await audit(db, shop.id, [
    {
      actor: "owner",
      action: "reorder.pay_link",
      entityType: "purchase_order",
      entityId: order.id,
      payload: { paymentId: link.id, amountPaise },
    },
  ]);
  return { payment_id: link.id, url: link.url, amount_paise: amountPaise, paid: false };
}
