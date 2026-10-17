import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { HttpError } from "@/lib/http";
import { langs } from "@/lib/i18n/languages";
import { positionOf } from "@/lib/rotation/credit";
import { sourceLabels } from "@/lib/rotation/labels";
import { indiaTime } from "@/lib/rotation/responses";
import { shopDate } from "@/lib/time";

// One customer's credit (GET /api/credit/{id}): every entry with where it came from, adding up to
// what they owe, and how they usually repay. Only the shop's own view ever shows this.

const customerRow = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  lang: z.enum(langs).nullable(),
});
const entryRow = z.object({
  id: z.string(),
  kind: z.enum(["credit_sale", "repayment"]),
  amount_paise: z.number().int(),
  source: z.enum(sourceLabels),
  note: z.string().nullable(),
  payment_id: z.string().nullable(),
  created_at: z.string(),
});

export async function creditDetail(db: SupabaseClient, shopId: string, customerId: string) {
  const [customer, entries] = await Promise.all([
    db
      .from("customers")
      .select("id, name, phone, lang")
      .eq("id", customerId)
      .eq("shop_id", shopId)
      .maybeSingle(),
    db
      .from("credit_ledger")
      .select("id, kind, amount_paise, source, note, payment_id, created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);
  if (customer.error) throw new Error(`Could not read the customer: ${customer.error.message}`);
  if (!customer.data) throw new HttpError(404, "No such customer.");
  if (entries.error) throw new Error(`Could not read the credit book: ${entries.error.message}`);
  const who = customerRow.parse(customer.data);
  const rows = z.array(entryRow).parse(entries.data);
  const position = positionOf(
    {
      customerId: who.id,
      name: who.name,
      phone: who.phone,
      lang: who.lang,
      entries: rows.map((r) => ({
        at: new Date(r.created_at).toISOString(),
        amountPaise: r.amount_paise,
        source: r.source,
      })),
    },
    shopDate(new Date()),
  );
  return {
    customer_id: who.id,
    name: who.name,
    lang: who.lang,
    balance_paise: rows.reduce((sum, r) => sum + r.amount_paise, 0),
    status: position?.status ?? null,
    entries: rows.map((r) => ({
      id: r.id,
      at: indiaTime(r.created_at),
      kind: r.kind,
      amount_paise: r.amount_paise,
      label: r.source,
      note: r.note,
      payment_id: r.payment_id,
    })),
  };
}
