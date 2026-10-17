import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { broadcastChanged } from "@/lib/realtime";
import type { Mandate } from "@/lib/rotation/mandate";
import { indiaTime } from "@/lib/rotation/responses";

// The owner's mandate for the bill-pay agent (decision of Oct 18): his weekly limit and the money
// that must stay in hand, his own words (owner_said). Changing it never overwrites a row: the old
// one is revoked and a new one added, so every limit he ever set stays on record.

export type LiveMandate = Mandate & { id: string; setAt: string };

const COLUMNS = "id, weekly_limit_paise, keep_in_hand_paise, set_at";
const mandateRow = z.object({
  id: z.string(),
  weekly_limit_paise: z.number().int(),
  keep_in_hand_paise: z.number().int(),
  set_at: z.string(),
});

/** Postgres' unique violation: another tap saved a limit at the same moment. */
const UNIQUE_VIOLATION = "23505";

function fromRow(data: unknown): LiveMandate {
  const row = mandateRow.parse(data);
  return {
    id: row.id,
    weeklyLimitPaise: row.weekly_limit_paise,
    keepInHandPaise: row.keep_in_hand_paise,
    setAt: new Date(row.set_at).toISOString(),
  };
}

export async function loadMandate(db: SupabaseClient, shopId: string): Promise<LiveMandate | null> {
  const { data, error } = await db
    .from("bill_pay_mandates")
    .select(COLUMNS)
    .eq("shop_id", shopId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Could not read the bill limit: ${error.message}`);
  return data ? fromRow(data) : null;
}

export function mandateJson(mandate: LiveMandate | null) {
  return (
    mandate && {
      weekly_limit_paise: mandate.weeklyLimitPaise,
      keep_in_hand_paise: mandate.keepInHandPaise,
      set_at: indiaTime(mandate.setAt),
      label: "owner_said" as const,
    }
  );
}

/** Ends the live mandate; its id, or null when there was none. */
async function revokeLive(db: SupabaseClient, shopId: string): Promise<string | null> {
  const { data, error } = await db
    .from("bill_pay_mandates")
    .update({ revoked_at: new Date().toISOString() })
    .eq("shop_id", shopId)
    .is("revoked_at", null)
    .select("id");
  if (error) throw new Error(`Could not end the old bill limit: ${error.message}`);
  return z.array(z.object({ id: z.string() })).parse(data ?? [])[0]?.id ?? null;
}

/**
 * The owner tapped "Save the limit". The old limit ends before the new one starts: if the second
 * write fails he is left with no limit, so the agent pays nothing rather than paying on an old one.
 */
export async function setMandate(db: SupabaseClient, shopId: string, mandate: Mandate) {
  const replaced = await revokeLive(db, shopId);
  const { data, error } = await db
    .from("bill_pay_mandates")
    .insert({
      shop_id: shopId,
      weekly_limit_paise: mandate.weeklyLimitPaise,
      keep_in_hand_paise: mandate.keepInHandPaise,
    })
    .select(COLUMNS)
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    throw new HttpError(409, "The limit just changed. Look again.");
  }
  if (error) throw new Error(`Could not save the bill limit: ${error.message}`);
  const saved = fromRow(data);
  await audit(db, shopId, [
    {
      actor: "owner",
      action: "mandate.set",
      entityType: "bill_pay_mandate",
      entityId: saved.id,
      payload: { ...mandate, replaced },
    },
  ]);
  await broadcastChanged(db, shopId, ["rotation"]);
  return mandateJson(saved);
}

/** The owner tapped Stop: from now on the agent pays nothing. */
export async function stopMandate(db: SupabaseClient, shopId: string) {
  const stopped = await revokeLive(db, shopId);
  if (!stopped) throw new HttpError(409, "There is no limit to stop.");
  await audit(db, shopId, [
    {
      actor: "owner",
      action: "mandate.stopped",
      entityType: "bill_pay_mandate",
      entityId: stopped,
    },
  ]);
  await broadcastChanged(db, shopId, ["rotation"]);
}
