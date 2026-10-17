import { choiceFor, itemFor } from "@/lib/agent/cards";
import type { CustomerBackend, OrderView, TurnResult } from "@/lib/customer/backend";
import type { Lang } from "@/lib/i18n/languages";
import { quantityPhrase, readBack } from "@/lib/i18n/speech";
import { textFor } from "@/lib/i18n/text";
import type { Cart } from "@/lib/orders/cart";
import { normalizeQuantity } from "@/lib/orders/quantity";
import type { PaymentMode } from "@/lib/orders/submit";
import { lineTotalPaise, orderTotalPaise } from "@/lib/orders/totals";
import { PREVIEW_ORDER_NUMBER, previewProduct } from "@/lib/preview/data";
import { creditRows, previewOwnerOrders } from "@/lib/preview/owner";
import type { Choice, TurnItem, TurnSource, VoiceTurn } from "@/lib/voice/turns";

// The customer side of the preview: the demo conversation from docs/PRODUCT-PLAN.md (flow 1),
// played in memory, so every screen can be tried before the keys exist. Whatever the customer
// says, the shop answers with the next line of the script.

const done: Record<Lang, string> = {
  ta: "அவ்வளவுதான்",
  hi: "बस, इतना ही",
  kn: "ಅಷ್ಟೇ",
  en: "That's all",
};

const offerJaggery: Record<Lang, string> = {
  ta: "2 Maggi, 1 butter சேர்த்தோம். சர்க்கரை தீர்ந்துவிட்டது, வெல்லம் வேண்டுமா?",
  hi: "2 Maggi और 1 butter जोड़ दिया। चीनी खत्म है, गुड़ चलेगा?",
  kn: "2 Maggi, 1 butter ಸೇರಿಸಿದೆ. ಸಕ್ಕರೆ ಮುಗಿದಿದೆ, ಬೆಲ್ಲ ಬೇಕೇ?",
  en: "Added 2 Maggi and 1 butter. Sugar is out of stock. Would you like jaggery instead?",
};

const APPROVE_AFTER_MS = 4000;
const CONFIRM_MS = 1500;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function previewCustomer(lang: Lang, customerName: string): CustomerBackend {
  const t = textFor(lang);
  const quantities = new Map<string, number>();
  const turns: VoiceTurn[] = [];
  let step: "order" | "done" = "order";
  let sent: {
    at: number;
    mode: PaymentMode;
    totalPaise: number;
    items: number;
    arts: string[];
  } | null = null;
  let paidAt: number | null = null;

  function turn(
    role: VoiceTurn["role"],
    text: string,
    source: TurnSource,
    extras: { choices?: Choice[]; items?: TurnItem[] } = {},
  ) {
    const added: VoiceTurn = {
      id: turns.length + 1,
      role,
      text,
      lang,
      source,
      choices: extras.choices ?? [],
      items: extras.items ?? [],
    };
    turns.push(added);
    return added;
  }

  function cart(): Cart {
    const lines = [...quantities].map(([code, qty]) => {
      const product = previewProduct(code);
      return {
        code,
        name: product.name,
        packSize: product.packSize,
        unit: product.unit,
        art: product.art,
        qty,
        unitPricePaise: product.pricePaise,
        lineTotalPaise: lineTotalPaise({ qty, unitPricePaise: product.pricePaise }),
      };
    });
    return { lines, totalPaise: orderTotalPaise(lines) };
  }

  function result(newTurns: VoiceTurn[], review = false): TurnResult {
    return { turns: newTurns, cart: cart(), review };
  }

  function setQty(code: string, qty: number) {
    const check = normalizeQuantity(previewProduct(code).unit, qty);
    if (check.ok) quantities.set(code, check.qty);
    else if (qty <= 0) quantities.delete(code);
  }

  async function answer(text: string, source: "voice" | "typed"): Promise<TurnResult> {
    await wait(900);
    const customer = turn("customer", text, source);
    if (step === "order") {
      step = "done";
      setQty("maggi", 2);
      setQty("butter", 1);
      const items = [
        itemFor(previewProduct("maggi"), 2, "added"),
        itemFor(previewProduct("butter"), 1, "added"),
        itemFor(previewProduct("sugar"), 0.5, "out_of_stock"),
      ];
      const choices = [choiceFor(previewProduct("jaggery"), 0.5)];
      return result([customer, turn("shop", offerJaggery[lang], "agent", { items, choices })]);
    }
    const current = cart();
    if (current.lines.length === 0) return result([customer, turn("shop", t.noted, "template")]);
    const reply = readBack(current.lines, current.totalPaise, lang);
    return result([customer, turn("shop", reply, "template")], true);
  }

  return {
    async start() {
      // A copy: handing out the list itself would let later turns appear on screen twice.
      if (turns.length > 0) return result([...turns]);
      const first = customerName.trim().split(/\s+/)[0] ?? customerName;
      return result([turn("shop", t.greeting(first), "template")]);
    },

    async speak(_audio, onHeard) {
      await wait(500);
      const heard = step === "order" ? t.exampleOrder : done[lang];
      onHeard(heard);
      return answer(heard, "voice");
    },

    say(text) {
      return answer(text, "typed");
    },

    async choose(turnId, index) {
      await wait(400);
      const choice = turns.find((x) => x.id === turnId)?.choices[index];
      if (!choice) return result([]);
      const product = previewProduct(choice.code);
      setQty(choice.code, (quantities.get(choice.code) ?? 0) + choice.qty);
      const item = `${quantityPhrase(choice.qty, product.unit, lang)} ${product.name}`;
      return result([
        turn("customer", choice.label, "chip"),
        turn("shop", `${t.added(item)} ${t.anythingElse}`, "template", {
          items: [itemFor(product, choice.qty, "added")],
        }),
      ]);
    },

    async setQuantity(code, qty) {
      setQty(code, qty);
      return cart();
    },

    async send(mode) {
      await wait(700);
      const current = cart();
      sent = {
        at: Date.now(),
        mode,
        totalPaise: current.totalPaise,
        items: current.lines.length,
        arts: current.lines.slice(0, 3).map((line) => line.art),
      };
      return { number: PREVIEW_ORDER_NUMBER };
    },

    async order(number) {
      if (!sent) throw new Error("No order sent yet");
      const approved = Date.now() - sent.at > APPROVE_AFTER_MS;
      const paid = paidAt !== null && Date.now() - paidAt > CONFIRM_MS;
      const owedBefore =
        creditRows(previewOwnerOrders()).find((row) => row.customer === customerName.trim())
          ?.owedPaise ?? 0;
      const view: OrderView = {
        number,
        status: "pending_approval",
        paymentMode: sent.mode,
        itemCount: sent.items,
        arts: sent.arts,
        totalPaise: sent.totalPaise,
        rejectReason: null,
        balancePaise: null,
        confirming: paidAt !== null && !paid,
        // The preview pays in place (see pay below); any link here just shows the Pay button.
        payUrl: "#pay",
      };
      if (!approved) return view;
      if (sent.mode === "credit") {
        return { ...view, status: "on_credit", balancePaise: owedBefore + sent.totalPaise };
      }
      return { ...view, status: paid ? "paid" : "awaiting_payment" };
    },

    async pay() {
      paidAt = Date.now();
    },

    audioUrl() {
      return null;
    },
  };
}
