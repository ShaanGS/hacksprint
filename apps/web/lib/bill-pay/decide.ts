import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { LIMIT_DAYS } from "@/lib/bill-pay/limits";
import { loadMandate } from "@/lib/bill-pay/mandate";
import { loadFestivalOrder } from "@/lib/rotation/festival";
import { moneyNow } from "@/lib/rotation/forecast";
import type { ShopData } from "@/lib/rotation/load";
import { decideBills } from "@/lib/rotation/mandate";

// Everything the bill-pay rules (lib/rotation/mandate.ts) read, besides the shop's numbers from
// loadShopData, in one parallel round: the live mandate, the festival order's bill, each
// distributor's UPI id and what the agent's own payments used of the limit in the last 7 days.

const DAY_MS = 86_400_000;

const upiRow = z.object({ id: z.string(), upi_id: z.string().nullable() });
const paidRow = z.object({ id: z.string(), amount_paise: z.number().int(), paid_at: z.string() });

async function loadUpiIds(db: SupabaseClient, shopId: string): Promise<Map<string, string>> {
  const { data, error } = await db.from("distributors").select("id, upi_id").eq("shop_id", shopId);
  if (error) throw new Error(`Could not read the distributors: ${error.message}`);
  const ids = new Map<string, string>();
  for (const row of z.array(upiRow).parse(data)) if (row.upi_id) ids.set(row.id, row.upi_id);
  return ids;
}

/** Bills paid under a bill-pay run in the last 7 days, newest first. */
async function paidByAgent(db: SupabaseClient, shopId: string, now: Date) {
  const since = new Date(now.getTime() - LIMIT_DAYS * DAY_MS).toISOString();
  const { data, error } = await db
    .from("payables")
    .select("id, amount_paise, paid_at")
    .eq("shop_id", shopId)
    .not("agent_run_id", "is", null)
    .gte("paid_at", since)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(`Could not read the agent's payments: ${error.message}`);
  return z
    .array(paidRow)
    .parse(data)
    .map((row) => ({
      payableId: row.id,
      amountPaise: row.amount_paise,
      paidAt: new Date(row.paid_at).toISOString(),
    }));
}

/** The rules' decision for every unpaid supplier bill, with what they were decided from. */
export async function billPayDecisions(db: SupabaseClient, shopId: string, data: ShopData) {
  const [mandate, festival, upiIds, paidThisWeek] = await Promise.all([
    loadMandate(db, shopId),
    loadFestivalOrder(db, shopId, data.receipts),
    loadUpiIds(db, shopId),
    paidByAgent(db, shopId, data.now),
  ]);
  // The same money in hand the week shows: last night's figure, plus verified payments, minus
  // bills paid since.
  const inHand = moneyNow(data.dayCloses, data.payments, data.payables, data.now);
  const result = decideBills({
    payables: data.payables.map((p) => ({ ...p, festivalOrder: p.id === festival?.payableId })),
    today: data.today,
    moneyInHandPaise: inHand.paise,
    mandate,
    paidByAgentLast7DaysPaise: paidThisWeek.reduce((sum, p) => sum + p.amountPaise, 0),
    upiIdOf: (distributorId) => upiIds.get(distributorId) ?? null,
  });
  return { ...result, mandate, festival, upiIds, paidThisWeek, inHand };
}

export type BillPayDecisions = Awaited<ReturnType<typeof billPayDecisions>>;
