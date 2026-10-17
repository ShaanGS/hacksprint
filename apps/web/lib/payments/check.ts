import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { HttpError } from "@/lib/http";
import { markPaid } from "@/lib/payments";
import { fetchLinkTransactions, successfulPayment } from "@/lib/paytm/client";

// Whether a payment link has been paid (A5). A Paytm link still waiting is asked about at Paytm,
// signed with our key, and a success for the full amount goes through the same idempotent
// markPaid as the webhook. Paytm's link webhook needs Paytm support to switch it on, so this
// keeps a payment verified on stage without it.

const paymentRow = z.object({
  id: z.string(),
  provider: z.enum(["paytm", "test"]),
  provider_link_id: z.string(),
  status: z.enum(["created", "paid", "failed", "expired"]),
  amount_paise: z.number().int(),
});

export async function checkPayment(
  db: SupabaseClient,
  shopId: string,
  paymentId: string,
): Promise<{ paid: boolean }> {
  const { data, error } = await db
    .from("payments")
    .select("id, provider, provider_link_id, status, amount_paise")
    .eq("id", paymentId)
    .eq("shop_id", shopId)
    .maybeSingle();
  if (error) throw new Error(`Could not read the payment: ${error.message}`);
  if (!data) throw new HttpError(404, "No such payment.");
  const payment = paymentRow.parse(data);
  if (payment.status === "paid") return { paid: true };
  if (payment.provider !== "paytm" || payment.status !== "created") return { paid: false };

  const paid = successfulPayment(
    await fetchLinkTransactions(payment.provider_link_id),
    payment.amount_paise,
  );
  if (!paid) return { paid: false };
  await markPaid(db, { id: payment.id }, paid.txnId, "paytm");
  return { paid: true };
}
