import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { n8nEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { reorderPlanFor } from "@/lib/reorder/plan";
import { linesTotalPaise } from "@/lib/rotation/reorder";
import type { Shop } from "@/lib/shop";

// The owner-approved order to one distributor (decision of Oct 17). It is saved as a purchase
// order, so the next bill from that distributor is checked against it (B4), then n8n emails it.
// A failed send leaves the order as a draft and says so.

const N8N_TIMEOUT_MS = 8_000;

type OrderLine = { name: string; qty: number; unit: string };

/** Posts the order to the n8n workflow; its first step checks the shared secret. */
async function emailThroughN8n(order: {
  shopName: string;
  distributorName: string;
  lines: OrderLine[];
}): Promise<boolean> {
  const env = n8nEnv();
  const response = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-munim-secret": env.N8N_WEBHOOK_SECRET },
    body: JSON.stringify(order),
    signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
  }).catch(() => null);
  return Boolean(response?.ok);
}

export async function sendReorder(
  db: SupabaseClient,
  shop: Shop,
  approved: { distributorId: string; productIds: string[] },
) {
  const plan = await reorderPlanFor(db, shop.id);
  const group = plan.groups.find((g) => g.distributorId === approved.distributorId);
  const wanted = new Set(approved.productIds);
  const lines = group ? group.lines.filter((line) => wanted.has(line.productId)) : [];
  if (!group || lines.length === 0 || lines.length !== wanted.size) {
    throw new HttpError(409, "The list changed. Look again.");
  }

  const created = await db
    .from("purchase_orders")
    .insert({
      shop_id: shop.id,
      distributor_id: group.distributorId,
      status: "draft",
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (created.error) throw new Error(`Could not save the order: ${created.error.message}`);
  const orderId = z.object({ id: z.string() }).parse(created.data).id;
  const items = await db.from("purchase_order_items").insert(
    lines.map((line) => ({
      purchase_order_id: orderId,
      product_id: line.productId,
      qty_ordered: line.qty,
    })),
  );
  if (items.error) throw new Error(`Could not save the order's items: ${items.error.message}`);

  const sent = await emailThroughN8n({
    shopName: shop.name,
    distributorName: group.distributor,
    lines: lines.map((line) => ({ name: line.name, qty: line.qty, unit: line.unit })),
  });
  if (!sent) throw new HttpError(502, "Could not reach n8n. The order was not sent.");

  const marked = await db
    .from("purchase_orders")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", orderId);
  if (marked.error) throw new Error(`Could not mark the order sent: ${marked.error.message}`);
  const totalPaise = linesTotalPaise(lines);
  await audit(db, shop.id, [
    {
      actor: "owner",
      action: "reorder.sent",
      entityType: "purchase_order",
      entityId: orderId,
      payload: {
        distributor: group.distributor,
        totalPaise,
        lines: lines.map((line) => ({ productId: line.productId, qty: line.qty })),
      },
    },
  ]);
  return {
    purchase_order_id: orderId,
    distributor: group.distributor,
    total_paise: totalPaise,
    lines: lines.length,
  };
}
