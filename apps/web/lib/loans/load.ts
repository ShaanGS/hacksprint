import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { MudraBandKey } from "@/lib/schemes/catalog";
import { storedStatement } from "@/lib/statement/load";

// A loan pack read back by its share link (D4): what was asked and why, the documents, the
// stock quotation and the statement, all frozen when the pack was made.

const bands = ["shishu", "kishore", "tarun", "tarun_plus"] satisfies MudraBandKey[];

const packRow = z.object({
  generated_at: z.string(),
  /** The Mudra band the loan falls in, or why Mudra does not cover it. */
  scheme_band: z.enum([...bands, "needs_tarun_repaid", "above_mudra"]),
  checklist: z.object({
    items: z.array(
      z.object({
        key: z.enum([
          "aadhaar",
          "pan",
          "udyam",
          "business_proof",
          "address_proof",
          "photos",
          "quotation",
          "bank_statements",
        ]),
        status: z.enum(["have", "missing", "bring"]),
      }),
    ),
    registration: z.discriminatedUnion("step", [
      z.object({ step: z.literal("none") }),
      z.object({ step: z.literal("udyam"), url: z.string(), fact: z.string() }),
      z.object({ step: z.literal("udyam_assist"), fact: z.string() }),
    ]),
    quotation: z
      .object({
        festival: z.string(),
        distributor: z.string(),
        bill_number: z.string().nullable(),
        lines: z.array(
          z.object({
            name: z.string(),
            qty: z.number(),
            unit_cost_paise: z.number().int(),
            line_paise: z.number().int(),
          }),
        ),
        total_paise: z.number().int(),
      })
      .nullable(),
  }),
  loan_requests: z.object({
    need_paise: z.number().int(),
    gap_without_order_paise: z.number().int(),
    can_collect_paise: z.number().int(),
    loan_needed_paise: z.number().int(),
    purpose: z.enum(["stock_rotation", "equipment"]),
  }),
  statements: z.object({ payload: storedStatement }),
});

export type LoanPackView = z.infer<typeof packRow>;

/** The pack behind a share link, or null when the link is unknown. */
export async function loadLoanPack(
  db: SupabaseClient,
  shareToken: string,
): Promise<LoanPackView | null> {
  const { data, error } = await db
    .from("loan_packs")
    .select(
      "generated_at, scheme_band, checklist, loan_requests(need_paise, gap_without_order_paise, can_collect_paise, loan_needed_paise, purpose), statements(payload)",
    )
    .eq("share_token", shareToken)
    .maybeSingle();
  if (error) throw new Error(`Could not read the loan pack: ${error.message}`);
  return data ? packRow.parse(data) : null;
}
