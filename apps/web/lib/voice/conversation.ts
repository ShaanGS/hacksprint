import type { SupabaseClient } from "@supabase/supabase-js";
import { itemFor } from "@/lib/agent/cards";
import { geminiGenerate } from "@/lib/agent/gemini-call";
import { systemPrompt } from "@/lib/agent/prompt";
import { runAgentTurn, type AgentTurn } from "@/lib/agent/run-turn";
import { runTool } from "@/lib/agent/tools";
import { audit } from "@/lib/audit";
import type { Product } from "@/lib/catalog";
import type { TurnResult } from "@/lib/customer/backend";
import type { Customer } from "@/lib/customers";
import type { Lang } from "@/lib/i18n/languages";
import { quantityPhrase, readBack } from "@/lib/i18n/speech";
import { textFor } from "@/lib/i18n/text";
import { addToCart, openDraft, readCart, type Cart } from "@/lib/orders/cart";
import type { Shop } from "@/lib/shop";
import { findCustomerTurn, recentTurns, recordTurns, type VoiceTurn } from "@/lib/voice/turns";

// A customer's conversation with the shop: the greeting, each spoken or typed turn through the
// agent, and each tapped choice, which needs no model at all.

export type Conversation = {
  db: SupabaseClient;
  shop: Shop;
  customer: Customer;
  lang: Lang;
  orderId: string;
  products: Product[];
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Opens (or resumes) the customer's order: the shop greets them once, by name. */
export async function openConversation(
  db: SupabaseClient,
  shop: Shop,
  customer: Customer,
  lang: Lang,
): Promise<{ orderId: string; turns: VoiceTurn[]; cart: Cart }> {
  const orderId = await openDraft(db, shop.id, customer.id, lang);
  let turns = await recentTurns(db, orderId);
  if (turns.length === 0) {
    const greeting = textFor(lang).greeting(firstName(customer.name));
    turns = await recordTurns(db, orderId, [
      { role: "shop", text: greeting, lang, source: "template", choices: [], items: [] },
    ]);
  }
  return { orderId, turns, cart: await readCart(db, orderId) };
}

/** One spoken or typed turn: the agent changes the cart through its tools and answers. */
export async function takeTurn(
  convo: Conversation,
  input: { text: string; source: "voice" | "typed"; sttMs?: number },
): Promise<TurnResult> {
  const started = Date.now();
  const { db, shop, customer, lang, orderId, products } = convo;
  const [history, cart] = await Promise.all([recentTurns(db, orderId, 12), readCart(db, orderId)]);
  const agent = await runAgentTurn(
    {
      generate: geminiGenerate(),
      runTool: (name, args) =>
        runTool({ db, shopId: shop.id, orderId, customerId: customer.id, products }, name, args),
    },
    {
      systemPrompt: systemPrompt({
        shopName: shop.name,
        customerName: customer.name,
        lang,
        products,
        cart,
      }),
      history,
      text: input.text,
      lang,
    },
  );
  const after = await readCart(db, orderId);
  const reply = replyText(agent, after, lang, shop.name);
  const turns = await recordTurns(db, orderId, [
    {
      role: "customer",
      text: input.text,
      lang,
      source: input.source,
      choices: [],
      items: [],
      sttMs: input.sttMs,
    },
    {
      role: "shop",
      text: reply.text,
      lang,
      source: reply.source,
      choices: agent.choices,
      items: agent.items,
      agentMs: Date.now() - started,
    },
  ]);
  await audit(db, shop.id, [
    ...agent.toolCalls.map((call) => ({
      actor: "agent" as const,
      action: `agent.${call.name}`,
      entityType: "order",
      entityId: orderId,
      payload: { args: call.args, result: call.response },
    })),
    ...(agent.problem
      ? [
          {
            actor: "agent" as const,
            action: "agent.fallback",
            entityType: "order",
            entityId: orderId,
            payload: { problem: agent.problem },
          },
        ]
      : []),
  ]);
  return {
    turns,
    cart: after,
    review: agent.outcome.kind === "review",
    sent: agent.outcome.kind === "sent" ? agent.outcome.number : undefined,
  };
}

/** Every amount the customer hears is built here by code; only the agent's own reply is not. */
function replyText(agent: AgentTurn, cart: Cart, lang: Lang, shopName: string) {
  const outcome = agent.outcome;
  if (outcome.kind === "reply") return { text: outcome.text, source: outcome.source };
  if (outcome.kind === "sent")
    return { text: textFor(lang).sentToShop(shopName), source: "template" as const };
  return { text: readBack(cart.lines, cart.totalPaise, lang), source: "template" as const };
}

/** A tapped choice ("Use jaggery"): straight into the cart, answered by a template. */
export async function takeChoice(
  convo: Conversation,
  turnId: number,
  index: number,
): Promise<TurnResult> {
  const { db, customer, lang, orderId, products } = convo;
  const t = textFor(lang);
  const choice = (await findCustomerTurn(db, customer.id, turnId))?.choices[index];
  const product = choice && products.find((p) => p.code === choice.code);
  if (!choice || !product) return { turns: [], cart: await readCart(db, orderId), review: false };

  const change = await addToCart(db, orderId, product, choice.qty, products);
  const added = change.status === "added" || change.status === "updated";
  const item = `${quantityPhrase(choice.qty, product.unit, lang)} ${product.name}`;
  const turns = await recordTurns(db, orderId, [
    { role: "customer", text: choice.label, lang, source: "chip", choices: [], items: [] },
    {
      role: "shop",
      text: added ? `${t.added(item)} ${t.anythingElse}` : t.fallback,
      lang,
      source: "template",
      choices: [],
      items: added ? [itemFor(product, change.qty, "added")] : [],
    },
  ]);
  return { turns, cart: await readCart(db, orderId), review: false };
}
