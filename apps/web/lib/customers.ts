import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { langs, type Lang } from "@/lib/i18n/languages";

const customerRow = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  lang: z.enum(langs).nullable(),
});

export type Customer = { id: string; name: string; phone: string; lang: Lang | null };

function toCustomer(row: z.infer<typeof customerRow>): Customer {
  return { id: row.id, name: row.name, phone: row.phone, lang: row.lang };
}

export async function findCustomer(db: SupabaseClient, id: string): Promise<Customer | null> {
  const { data, error } = await db
    .from("customers")
    .select("id, name, phone, lang")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not read the customer: ${error.message}`);
  return data ? toCustomer(customerRow.parse(data)) : null;
}

/**
 * The customer with this phone, created on their first order. A returning customer keeps their
 * history (and their usual basket) and gets the name and language they gave this time.
 */
export async function saveCustomer(
  db: SupabaseClient,
  shopId: string,
  details: { name: string; phone: string; lang: Lang },
): Promise<Customer> {
  const { data, error } = await db
    .from("customers")
    .upsert(
      { shop_id: shopId, name: details.name, phone: details.phone, lang: details.lang },
      { onConflict: "shop_id,phone" },
    )
    .select("id, name, phone, lang")
    .single();
  if (error) throw new Error(`Could not save the customer: ${error.message}`);
  return toCustomer(customerRow.parse(data));
}
