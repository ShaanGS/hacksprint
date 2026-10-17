import type { SupabaseClient } from "@supabase/supabase-js";
import { audit } from "@/lib/audit";
import { loadProfile } from "@/lib/loans/profile";
import { loanFigures } from "@/lib/loans/ready";
import { formatMoney } from "@/lib/money";
import { lineTotalPaise, orderTotalPaise } from "@/lib/orders/totals";
import { answerWordsFor } from "@/lib/owner-voice/answer-words";
import type { Question } from "@/lib/owner-voice/types";
import { collectOrder, type CustomerPosition } from "@/lib/rotation/credit";
import { overdueDays, type ForecastState } from "@/lib/rotation/forecast";
import { loadFestivalOrder } from "@/lib/rotation/festival";
import { loadShopData, type ShopData } from "@/lib/rotation/load";
import { snapshotOf, type Snapshot } from "@/lib/rotation/snapshot";
import { mudraBand } from "@/lib/schemes/band";
import { schemeWords } from "@/lib/schemes/catalog";
import type { Shop } from "@/lib/shop";

// A spoken question about the owner's own money (B1, beside the four entries): the model picked
// the topic, and the answer is a fixed sentence with numbers from lib/rotation (rule 1).

const LIST_MAX = 3;

export type AnswerFacts = {
  week: {
    state: ForecastState;
    gapPaise: number;
    neededPaise: number;
    likelyPaise: number;
    latePaise: number;
    lateCustomers: number;
  };
  positions: CustomerPosition[];
  /** The customer asked about, found even when they owe nothing. */
  customerName: string | null;
  onShelfPaise: number;
  stuckPaise: number;
  low: string[];
  /** Unpaid, soonest first. */
  dues: { distributor: string; amountPaise: number; dueDate: string; overdueDays: number }[];
  loan: {
    festival: string;
    needPaise: number;
    loanPaise: number;
    latePaise: number;
    band: string | null;
  } | null;
  /** For "items": each line at the shop's own selling price. */
  items: { name: string; qty: number; linePaise: number }[];
};

function day(date: string, lang: "en" | "ta") {
  return new Date(`${date}T12:00:00+05:30`).toLocaleDateString(lang === "ta" ? "ta-IN" : "en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

/** The answer in the reader's language, every number from the facts. */
export function answerText(question: Question, facts: AnswerFacts, lang: "en" | "ta"): string {
  const words = answerWordsFor(lang);
  const { week } = facts;
  switch (question.topic) {
    case "week":
      return (
        words.week(week.state, week.gapPaise, week.neededPaise, week.likelyPaise) +
        (week.lateCustomers > 0 ? words.lateCanBring(week.lateCustomers, week.latePaise) : "")
      );
    case "collect": {
      if (facts.positions.length === 0) return words.nobodyOwes;
      const late = collectOrder(facts.positions).filter((p) => p.status.kind === "late");
      if (late.length === 0) {
        const total = facts.positions.reduce((sum, p) => sum + p.balancePaise, 0);
        return words.nobodyLate(facts.positions.length, total);
      }
      const list = late
        .slice(0, LIST_MAX)
        .map((p) => `${p.name} ${formatMoney(p.balancePaise)}`)
        .join(", ");
      return words.lateList(late.length, list, late[0].name);
    }
    case "customer": {
      const position = facts.positions.find((p) => p.customerId === question.customerId);
      if (position) return words.owes(position.name, position.balancePaise, position.status);
      return facts.customerName ? words.owesNothing(facts.customerName) : words.noName;
    }
    case "stock":
      return (
        words.stock(facts.onShelfPaise, facts.stuckPaise) +
        (facts.low.length > 0 ? words.low(facts.low.slice(0, LIST_MAX).join(", ")) : "")
      );
    case "dues": {
      if (facts.dues.length === 0) return words.noDues;
      const total = facts.dues.reduce((sum, d) => sum + d.amountPaise, 0);
      const overdue = facts.dues.find((d) => d.overdueDays > 0);
      const next = facts.dues.find((d) => d.overdueDays === 0);
      const shown = (d: AnswerFacts["dues"][number]) => ({ ...d, dueOn: day(d.dueDate, lang) });
      return (
        words.dues(total) +
        (overdue ? words.overdue(shown(overdue)) : "") +
        (next ? words.next(shown(next)) : "")
      );
    }
    case "loan": {
      const { loan } = facts;
      if (!loan) return words.noOrder;
      if (loan.loanPaise === 0) return words.noLoan(loan.latePaise);
      return words.loan(loan.festival, loan.needPaise, loan.loanPaise, loan.band ?? "");
    }
    case "collect_agent":
      return week.lateCustomers > 0
        ? words.collectAgent(week.lateCustomers, week.latePaise)
        : words.collectNobody;
    case "reorder":
      return facts.low.length > 0
        ? words.reorderAgent(facts.low.length, facts.low.slice(0, LIST_MAX).join(", "))
        : words.reorderNothing;
    case "items": {
      const notSold = question.missing.length > 0 ? words.notSold(question.missing.join(", ")) : "";
      if (facts.items.length === 0) return notSold ? notSold.trim() : words.noItems;
      const total = orderTotalPaise(
        facts.items.map((i) => ({ qty: 1, unitPricePaise: i.linePaise })),
      );
      const lines = facts.items
        .map((i) => `${i.name} × ${i.qty} ${formatMoney(i.linePaise)}`)
        .join(", ");
      return words.items(total, lines) + notSold;
    }
  }
}

function factsOf(data: ShopData, snapshot: Snapshot, question: Question): AnswerFacts {
  const { customerId } = question;
  const { week } = snapshot;
  return {
    week: {
      state: week.state,
      gapPaise: week.gapPaise,
      neededPaise: week.needed.paise,
      likelyPaise: week.likely.paise,
      latePaise: week.late.paise,
      lateCustomers: week.late.customers,
    },
    positions: snapshot.positions,
    customerName: data.customers.find((c) => c.customerId === customerId)?.name ?? null,
    onShelfPaise: snapshot.onShelf.paise,
    stuckPaise: snapshot.stuck.paise,
    low: snapshot.items.filter((i) => i.tags.includes("low")).map((i) => i.product.name),
    dues: data.payables
      .filter((p) => !p.paid)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .map((p) => ({
        distributor: p.distributor,
        amountPaise: p.amountPaise,
        dueDate: p.dueDate,
        overdueDays: overdueDays(p.dueDate, data.today),
      })),
    loan: null,
    items: question.items.flatMap((item) => {
      const product = data.products.find((p) => p.id === item.productId);
      if (!product) return [];
      const linePaise = lineTotalPaise({ qty: item.qty, unitPricePaise: product.pricePaise });
      return [{ name: product.name, qty: item.qty, linePaise }];
    }),
  };
}

async function loanFacts(db: SupabaseClient, shop: Shop, data: ShopData, lang: "en" | "ta") {
  const order = await loadFestivalOrder(db, shop.id, data.receipts);
  if (!order) return null;
  const { loanNeededPaise, canCollectPaise } = loanFigures(data, order, order.totalPaise);
  const profile = await loadProfile(db, shop.id);
  const band = loanNeededPaise > 0 ? mudraBand(loanNeededPaise, profile.repaidTarunBefore) : null;
  return {
    festival: order.festival,
    needPaise: order.totalPaise,
    loanPaise: loanNeededPaise,
    latePaise: canCollectPaise,
    band: band?.covered ? schemeWords(lang).band(band.band.key).name : null,
  };
}

export async function answerQuestion(
  db: SupabaseClient,
  shop: Shop,
  transcript: string,
  question: Question,
  lang: "en" | "ta",
) {
  const data = await loadShopData(db, shop.id);
  const facts = factsOf(data, snapshotOf(data), question);
  if (question.topic === "loan") facts.loan = await loanFacts(db, shop, data, lang);
  const text = answerText(question, facts, lang);
  await audit(db, shop.id, [
    { actor: "agent", action: "voice.question", payload: { transcript, topic: question.topic } },
  ]);
  return {
    entry_id: null,
    transcript,
    kind: "question" as const,
    card: null,
    needs: [],
    choices: [],
    answer: { topic: question.topic, text },
  };
}
