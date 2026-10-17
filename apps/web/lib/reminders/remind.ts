import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { langs } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import { creditPaymentLink } from "@/lib/payments";
import { reminderText, whatsappUrl } from "@/lib/reminders/templates";
import type { OpenReminder } from "@/lib/rotation/responses";
import type { Shop } from "@/lib/shop";

// A reminder (spec A4): a payment link for what the customer owes and a WhatsApp message from a
// fixed template in their language. The owner opens WhatsApp and presses send himself (rule 3).
// Tapping again while the link is unpaid gives the same link, not a second one.

const customerRow = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  lang: z.enum(langs).nullable(),
});
const ledgerRow = z.object({ amount_paise: z.number().int() });
const reminderRow = z.object({
  id: z.string(),
  customer_id: z.string(),
  amount_paise: z.number().int(),
  payment_link_id: z.string().nullable(),
  payment_link_url: z.string().nullable(),
  message_text: z.string().nullable(),
  created_at: z.string(),
});

export type Reminder = {
  reminderId: string;
  paymentId: string;
  amountPaise: number;
  messageText: string;
  paymentLinkUrl: string;
  whatsappUrl: string;
};

/** Unpaid reminders by customer, for the collect list. */
export async function openReminders(
  db: SupabaseClient,
  shopId: string,
): Promise<Map<string, OpenReminder>> {
  const { data, error } = await db
    .from("credit_reminders")
    .select(
      "id, customer_id, amount_paise, payment_link_id, payment_link_url, message_text, created_at",
    )
    .eq("shop_id", shopId)
    .eq("status", "draft")
    .order("created_at");
  if (error) throw new Error(`Could not read the reminders: ${error.message}`);
  return new Map(
    z
      .array(reminderRow)
      .parse(data)
      .map((r) => [
        r.customer_id,
        {
          id: r.id,
          paymentId: r.payment_link_id,
          paymentLinkUrl: r.payment_link_url,
          createdAt: r.created_at,
        },
      ]),
  );
}

export async function remindCustomer(
  db: SupabaseClient,
  shop: Shop,
  customerId: string,
): Promise<Reminder> {
  const [customerResult, ledgerResult, openResult] = await Promise.all([
    db
      .from("customers")
      .select("id, name, phone, lang")
      .eq("id", customerId)
      .eq("shop_id", shop.id)
      .maybeSingle(),
    db.from("credit_ledger").select("amount_paise").eq("customer_id", customerId),
    db
      .from("credit_reminders")
      .select(
        "id, customer_id, amount_paise, payment_link_id, payment_link_url, message_text, created_at",
      )
      .eq("customer_id", customerId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (customerResult.error)
    throw new Error(`Could not read the customer: ${customerResult.error.message}`);
  if (!customerResult.data) throw new HttpError(404, "No such customer.");
  if (ledgerResult.error)
    throw new Error(`Could not read the credit book: ${ledgerResult.error.message}`);
  if (openResult.error)
    throw new Error(`Could not read the reminders: ${openResult.error.message}`);
  const customer = customerRow.parse(customerResult.data);
  const owed = z
    .array(ledgerRow)
    .parse(ledgerResult.data)
    .reduce((sum, e) => sum + e.amount_paise, 0);
  if (owed <= 0) throw new HttpError(409, "This customer owes nothing.");

  const open = openResult.data ? reminderRow.parse(openResult.data) : null;
  if (
    open &&
    open.amount_paise === owed &&
    open.payment_link_id &&
    open.payment_link_url &&
    open.message_text
  ) {
    await db
      .from("credit_reminders")
      .update({ opened_at: new Date().toISOString() })
      .eq("id", open.id);
    return {
      reminderId: open.id,
      paymentId: open.payment_link_id,
      amountPaise: owed,
      messageText: open.message_text,
      paymentLinkUrl: open.payment_link_url,
      whatsappUrl: whatsappUrl(customer.phone, open.message_text),
    };
  }
  // An unpaid link for an older amount would settle the wrong sum; it is replaced.
  if (open) await db.from("credit_reminders").update({ status: "failed" }).eq("id", open.id);

  const { data, error } = await db
    .from("credit_reminders")
    .insert({
      shop_id: shop.id,
      customer_id: customer.id,
      amount_paise: owed,
      language: customer.lang ?? "ta",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not start the reminder: ${error.message}`);
  const reminderId = z.object({ id: z.string() }).parse(data).id;
  const link = await creditPaymentLink(db, shop, {
    reminderId,
    customerId: customer.id,
    amountPaise: owed,
  });
  const messageText = reminderText(customer.lang ?? "ta", {
    customer: customer.name,
    shop: shop.name,
    amount: formatMoney(owed),
    link: link.url,
  });
  const saved = await db
    .from("credit_reminders")
    .update({
      payment_link_id: link.id,
      payment_link_url: link.url,
      message_text: messageText,
      opened_at: new Date().toISOString(),
    })
    .eq("id", reminderId);
  if (saved.error) throw new Error(`Could not save the reminder: ${saved.error.message}`);
  await audit(db, shop.id, [
    {
      actor: "owner",
      action: "credit.reminder",
      entityType: "customer",
      entityId: customer.id,
      payload: { amountPaise: owed },
    },
  ]);
  return {
    reminderId,
    paymentId: link.id,
    amountPaise: owed,
    messageText,
    paymentLinkUrl: link.url,
    whatsappUrl: whatsappUrl(customer.phone, messageText),
  };
}
