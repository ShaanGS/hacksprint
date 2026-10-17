import type { SupabaseClient } from "@supabase/supabase-js";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { broadcastChanged } from "@/lib/realtime";
import type { ShopData } from "@/lib/rotation/load";
import { overdueDays } from "@/lib/rotation/forecast";

// What the shop owes its distributors (GET /api/payables) and the owner saying he paid one.
// A payment he says he made is his word (owner_said); only a provider-seen payment is verified.

export function payablesResponse(data: ShopData) {
  const unpaid = data.payables
    .filter((p) => !p.paid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    total_paise: unpaid.reduce((sum, p) => sum + p.amountPaise, 0),
    payables: unpaid.map((p) => ({
      id: p.id,
      distributor: p.distributor,
      bill_number: p.billNumber,
      kind: p.kind,
      amount_paise: p.amountPaise,
      due_date: p.dueDate,
      overdue_days: overdueDays(p.dueDate, data.today),
      label: p.kind === "loan_emi" ? "owner_said" : "supplier_bill",
      festival_order: p.purchaseOrderId !== null,
    })),
  };
}

export async function markPayablePaid(
  db: SupabaseClient,
  shopId: string,
  payableId: string,
  paidVia: "cash" | "bank" | "upi",
) {
  const { data, error } = await db
    .from("payables")
    .update({ paid_at: new Date().toISOString(), paid_via: paidVia })
    .eq("id", payableId)
    .eq("shop_id", shopId)
    .is("paid_at", null)
    .select("id, amount_paise")
    .maybeSingle();
  if (error) throw new Error(`Could not record the payment: ${error.message}`);
  if (!data) throw new HttpError(409, "This bill is already paid, or does not exist.");
  await audit(db, shopId, [
    {
      actor: "owner",
      action: "payable.paid",
      entityType: "payable",
      entityId: payableId,
      payload: { paidVia },
    },
  ]);
  await broadcastChanged(db, shopId, ["rotation"]);
}
