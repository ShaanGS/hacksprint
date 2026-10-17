import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { sourceLabels } from "@/lib/rotation/labels";

// A frozen statement read back by its share link (D2). The schema is what saveStatement writes,
// so a statement saved by an older build that no longer fits is refused, not half drawn.

const label = z.enum(sourceLabels);
const row = z.object({ date: z.string(), paise: z.number().int(), late: z.boolean().optional() });
const monthly = z.object({ label, byMonth: z.array(z.number().int()), rows: z.array(row) });

export const storedStatement = z.object({
  shop: z.string(),
  period: z.object({ from: z.string(), to: z.string() }),
  generated_at: z.string(),
  demo_data: z.boolean(),
  blocks: z.object({
    months: z.array(z.string()),
    verified: z.object({
      digitalPayments: monthly,
      creditRecoveredByLink: monthly.extend({ medianDays: z.number().nullable() }),
      supplierBills: monthly.extend({ count: z.array(z.number().int()) }),
    }),
    declared: z.object({
      cashSales: monthly,
      creditGiven: monthly,
      creditRecoveredCash: monthly,
      billsPaidOnTime: z.object({
        label,
        percent: z.number().nullable(),
        bills: z.number().int(),
        rows: z.array(row),
      }),
      regularCreditCustomers: z.object({ label, count: z.number().int() }),
      averageStockValue: z.object({ label, paise: z.number().nullable(), rows: z.array(row) }),
      moneyCycleDays: z.object({ label, days: z.number().nullable() }),
    }),
  }),
});

export type StoredStatement = z.infer<typeof storedStatement>;

/** The statement behind a share link, or null when the link is unknown. */
export async function loadStatement(
  db: SupabaseClient,
  shareToken: string,
): Promise<StoredStatement | null> {
  const { data, error } = await db
    .from("statements")
    .select("payload")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (error) throw new Error(`Could not read the statement: ${error.message}`);
  return data ? storedStatement.parse(data.payload) : null;
}
