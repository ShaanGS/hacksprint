import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { langs, type Lang } from "@/lib/i18n/languages";

// The conversation on an order: what the customer said, typed or tapped, and what the shop said
// back. Shop turns are what the audio endpoint reads aloud.

/** A tappable answer the shop offers: add this product at this quantity. */
export type Choice = { label: string; code: string; qty: number };

export type TurnSource = "voice" | "typed" | "chip" | "agent" | "template";

export type VoiceTurn = {
  id: number;
  role: "customer" | "shop";
  text: string;
  lang: Lang;
  source: TurnSource;
  choices: Choice[];
};

export type NewTurn = Omit<VoiceTurn, "id"> & { sttMs?: number; agentMs?: number };

const COLUMNS = "id, role, text, lang, source, choices";

const turnRow = z.object({
  id: z.coerce.number(),
  role: z.enum(["customer", "shop"]),
  text: z.string(),
  lang: z.enum(langs),
  source: z.enum(["voice", "typed", "chip", "agent", "template"]),
  choices: z.array(z.object({ label: z.string(), code: z.string(), qty: z.number() })),
});

export async function recordTurns(
  db: SupabaseClient,
  orderId: string,
  turns: NewTurn[],
): Promise<VoiceTurn[]> {
  const { data, error } = await db
    .from("voice_turns")
    .insert(
      turns.map((turn) => ({
        order_id: orderId,
        role: turn.role,
        text: turn.text,
        lang: turn.lang,
        source: turn.source,
        choices: turn.choices,
        stt_ms: turn.sttMs ?? null,
        agent_ms: turn.agentMs ?? null,
      })),
    )
    .select(COLUMNS);
  if (error) throw new Error(`Could not save the conversation: ${error.message}`);
  return z
    .array(turnRow)
    .parse(data)
    .sort((a, b) => a.id - b.id);
}

/** The latest turns of an order, oldest first. */
export async function recentTurns(
  db: SupabaseClient,
  orderId: string,
  limit = 30,
): Promise<VoiceTurn[]> {
  const { data, error } = await db
    .from("voice_turns")
    .select(COLUMNS)
    .eq("order_id", orderId)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not read the conversation: ${error.message}`);
  return z.array(turnRow).parse(data).reverse();
}

/** A turn on one of this customer's orders, or null if it is not theirs. */
export async function findCustomerTurn(
  db: SupabaseClient,
  customerId: string,
  turnId: number,
): Promise<VoiceTurn | null> {
  const { data, error } = await db
    .from("voice_turns")
    .select(`${COLUMNS}, orders!inner(customer_id)`)
    .eq("id", turnId)
    .eq("orders.customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(`Could not read turn ${turnId}: ${error.message}`);
  return data ? turnRow.parse(data) : null;
}
