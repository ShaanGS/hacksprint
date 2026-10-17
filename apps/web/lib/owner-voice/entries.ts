import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { loadCatalog } from "@/lib/catalog";
import { HttpError } from "@/lib/http";
import { langInfo, type Lang } from "@/lib/i18n/languages";
import { answerQuestion } from "@/lib/owner-voice/answers";
import { readByWords } from "@/lib/owner-voice/fallback";
import { readEntry } from "@/lib/owner-voice/read";
import type { Named, ParsedEntry } from "@/lib/owner-voice/types";
import { broadcastChanged, type ChangedArea } from "@/lib/realtime";
import { speechToText } from "@/lib/sarvam/client";
import type { Shop } from "@/lib/shop";
import { shopDate } from "@/lib/time";

// The owner's voice entries (B1): heard, read into one entry, shown as a card, and written only
// when he taps yes (rule 3). Every write is audited and tells open screens to refresh.

const MAX_KEYTERMS = 50;
const customerRow = z.object({ id: z.string(), name: z.string() });
const parsedSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.enum(["credit_given", "credit_repaid_cash"]),
    customerId: z.string().nullable(),
    amountPaise: z.number().int().nullable(),
  }),
  z.object({
    kind: z.literal("day_close"),
    cashSalesPaise: z.number().int().nullable(),
    moneyInHandPaise: z.number().int().nullable(),
  }),
  z.object({
    kind: z.literal("stock_count"),
    productId: z.string().nullable(),
    qty: z.number().nullable(),
  }),
]);
const entryRow = z.object({ id: z.string(), transcript: z.string(), parsed: parsedSchema });

async function namesFor(db: SupabaseClient, shopId: string) {
  const [customers, products] = await Promise.all([
    db.from("customers").select("id, name").eq("shop_id", shopId).order("name"),
    loadCatalog(db, shopId),
  ]);
  if (customers.error) throw new Error(`Could not read the customers: ${customers.error.message}`);
  return {
    customers: z.array(customerRow).parse(customers.data) as Named[],
    products: products.map((p) => ({ id: p.id, name: p.name, code: p.code, art: p.art })),
  };
}

/** What still needs a tap (a name not matched) or a second try (a number not heard). */
export function needsOf(parsed: ParsedEntry): string[] {
  switch (parsed.kind) {
    case "credit_given":
    case "credit_repaid_cash":
      return [
        ...(parsed.customerId ? [] : ["customer"]),
        ...(parsed.amountPaise ? [] : ["amount"]),
      ];
    case "day_close":
      return parsed.cashSalesPaise === null && parsed.moneyInHandPaise === null ? ["amount"] : [];
    case "stock_count":
      return [...(parsed.productId ? [] : ["product"]), ...(parsed.qty === null ? ["qty"] : [])];
  }
}

function cardOf(parsed: ParsedEntry, customers: Named[], products: Named[]) {
  const named = (list: Named[], id: string | null) => list.find((item) => item.id === id) ?? null;
  switch (parsed.kind) {
    case "credit_given":
    case "credit_repaid_cash":
      return { customer: named(customers, parsed.customerId), amount_paise: parsed.amountPaise };
    case "day_close":
      return {
        cash_sales_paise: parsed.cashSalesPaise,
        money_in_hand_paise: parsed.moneyInHandPaise,
      };
    case "stock_count":
      return { product: named(products, parsed.productId), qty: parsed.qty };
  }
}

/** Who or what the owner can tap instead, when the card's name is missing or wrong. */
function choicesOf(parsed: ParsedEntry, customers: Named[], products: (Named & { art: string })[]) {
  if (parsed.kind === "credit_given" || parsed.kind === "credit_repaid_cash") return customers;
  if (parsed.kind === "stock_count")
    return products.map((p) => ({ id: p.id, name: p.name, art: p.art }));
  return [];
}

export async function hearEntry(db: SupabaseClient, shop: Shop, audio: Blob, lang: Lang) {
  const { customers, products } = await namesFor(db, shop.id);
  const heard = await speechToText(audio, audio.type.includes("mp4") ? "owner.mp4" : "owner.webm", {
    languageCode: langInfo[shop.ownerLang].sarvamCode,
    keyterms: [...customers.map((c) => c.name), ...products.map((p) => p.name)].slice(
      0,
      MAX_KEYTERMS,
    ),
  });
  const transcript = heard.transcript.trim();
  const read = transcript
    ? await readEntry(transcript, customers, products).catch(() => null)
    : null;
  if (read?.kind === "question") {
    return answerQuestion(db, shop, transcript, read, lang === "ta" ? "ta" : "en");
  }
  const parsed = read ?? readByWords(transcript, customers, products);
  if (!parsed) {
    await audit(db, shop.id, [
      { actor: "agent", action: "voice.not_understood", payload: { transcript } },
    ]);
    return {
      entry_id: null,
      transcript,
      kind: null,
      card: null,
      needs: [],
      choices: [],
      answer: null,
    };
  }
  const { data, error } = await db
    .from("owner_voice_entries")
    .insert({ shop_id: shop.id, kind: parsed.kind, transcript, lang: shop.ownerLang, parsed })
    .select("id")
    .single();
  if (error) throw new Error(`Could not keep the entry: ${error.message}`);
  const entryId = z.object({ id: z.string() }).parse(data).id;
  await audit(db, shop.id, [
    {
      actor: "agent",
      action: "voice.heard",
      entityType: "owner_voice_entry",
      entityId: entryId,
      payload: { transcript, parsed },
    },
  ]);
  return {
    entry_id: entryId,
    transcript,
    kind: parsed.kind,
    card: cardOf(parsed, customers, products),
    needs: needsOf(parsed),
    choices: choicesOf(parsed, customers, products),
    answer: null,
  };
}

async function apply(
  db: SupabaseClient,
  shopId: string,
  entryId: string,
  transcript: string,
  parsed: ParsedEntry,
) {
  const credit = (kind: "credit_sale" | "repayment", customerId: string, amountPaise: number) =>
    db.from("credit_ledger").insert({
      shop_id: shopId,
      customer_id: customerId,
      kind,
      amount_paise: kind === "credit_sale" ? amountPaise : -amountPaise,
      note: transcript,
      source: "owner_said",
      voice_entry_id: entryId,
    });
  if (parsed.kind === "day_close") {
    await saveDayClose(db, shopId, entryId, parsed);
    return ["rotation"] as ChangedArea[];
  }
  if (parsed.kind === "stock_count") {
    const result = await db.from("shelf_counts").insert({
      shop_id: shopId,
      product_id: parsed.productId,
      counted_qty: parsed.qty,
      voice_entry_id: entryId,
    });
    if (result.error) throw new Error(`Could not write the count: ${result.error.message}`);
    return ["stock", "rotation"] as ChangedArea[];
  }
  if (!parsed.customerId || !parsed.amountPaise) throw new HttpError(400, "Say who and how much.");
  const kind = parsed.kind === "credit_given" ? "credit_sale" : "repayment";
  const result = await credit(kind, parsed.customerId, parsed.amountPaise);
  if (result.error) throw new Error(`Could not write the credit: ${result.error.message}`);
  return ["credit", "rotation"] as ChangedArea[];
}

/** Tonight's line; a second one the same day updates what it says and keeps the rest. */
async function saveDayClose(
  db: SupabaseClient,
  shopId: string,
  entryId: string,
  parsed: Extract<ParsedEntry, { kind: "day_close" }>,
) {
  const businessDate = shopDate(new Date());
  const { data, error } = await db
    .from("day_close")
    .select("id, cash_sales_paise, money_in_hand_paise")
    .eq("shop_id", shopId)
    .eq("business_date", businessDate)
    .maybeSingle();
  if (error) throw new Error(`Could not read tonight's numbers: ${error.message}`);
  const row = {
    shop_id: shopId,
    business_date: businessDate,
    cash_sales_paise: parsed.cashSalesPaise ?? data?.cash_sales_paise ?? null,
    money_in_hand_paise: parsed.moneyInHandPaise ?? data?.money_in_hand_paise ?? null,
    recorded_at: new Date().toISOString(),
    voice_entry_id: entryId,
  };
  const saved = data
    ? await db.from("day_close").update(row).eq("id", data.id)
    : await db.from("day_close").insert(row);
  if (saved.error) throw new Error(`Could not save tonight's numbers: ${saved.error.message}`);
}

export async function decideEntry(
  db: SupabaseClient,
  shopId: string,
  entryId: string,
  decision: { confirm: false } | { confirm: true; customerId?: string; productId?: string },
) {
  const { data, error } = await db
    .from("owner_voice_entries")
    .update({
      status: decision.confirm ? "confirmed" : "rejected",
      decided_at: new Date().toISOString(),
    })
    .eq("id", entryId)
    .eq("shop_id", shopId)
    .eq("status", "pending")
    .select("id, transcript, parsed")
    .maybeSingle();
  if (error) throw new Error(`Could not decide the entry: ${error.message}`);
  if (!data) throw new HttpError(409, "This entry was already decided.");
  const entry = entryRow.parse(data);
  if (!decision.confirm) {
    await audit(db, shopId, [
      {
        actor: "owner",
        action: "voice.rejected",
        entityType: "owner_voice_entry",
        entityId: entryId,
      },
    ]);
    return { ok: true, kind: entry.parsed.kind };
  }
  const parsed = withPicks(entry.parsed, decision);
  try {
    await checkPicks(db, shopId, decision);
    if (needsOf(parsed).length > 0)
      throw new HttpError(400, `Still needs: ${needsOf(parsed).join(", ")}.`);
    const areas = await apply(db, shopId, entryId, entry.transcript, parsed);
    await audit(db, shopId, [
      {
        actor: "owner",
        action: "voice.confirmed",
        entityType: "owner_voice_entry",
        entityId: entryId,
        payload: { parsed },
      },
    ]);
    await broadcastChanged(db, shopId, areas);
  } catch (failure) {
    // Nothing was written, so the card can be confirmed again.
    await db
      .from("owner_voice_entries")
      .update({ status: "pending", decided_at: null })
      .eq("id", entryId);
    throw failure;
  }
  return { ok: true, kind: parsed.kind };
}

/** A tapped customer or product must be the shop's own. */
async function checkPicks(
  db: SupabaseClient,
  shopId: string,
  picks: { customerId?: string; productId?: string },
) {
  const { customers, products } = await namesFor(db, shopId);
  if (picks.customerId && !customers.some((c) => c.id === picks.customerId))
    throw new HttpError(400, "No such customer.");
  if (picks.productId && !products.some((p) => p.id === picks.productId))
    throw new HttpError(400, "No such product.");
}

function withPicks(
  parsed: ParsedEntry,
  picks: { customerId?: string; productId?: string },
): ParsedEntry {
  if (
    (parsed.kind === "credit_given" || parsed.kind === "credit_repaid_cash") &&
    picks.customerId
  ) {
    return { ...parsed, customerId: picks.customerId };
  }
  if (parsed.kind === "stock_count" && picks.productId)
    return { ...parsed, productId: picks.productId };
  return parsed;
}
