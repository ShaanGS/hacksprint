import { mudraBand } from "@/lib/schemes/band";
import { loanFigures } from "@/lib/loans/ready";
import { collectOrder } from "@/lib/rotation/credit";
import type { FestivalOrder } from "@/lib/rotation/festival";
import { overdueDays } from "@/lib/rotation/forecast";
import type { SourceLabel } from "@/lib/rotation/labels";
import { weakest } from "@/lib/rotation/labels";
import type { ShopData } from "@/lib/rotation/load";
import { reorderPlan } from "@/lib/rotation/reorder";
import { indiaTime } from "@/lib/rotation/responses";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { addDays, daysBetween } from "@/lib/time";

// Everything the planner may look at, worked out once per run from one read of the shop
// (loadShopData), so every tool answers from the same moment and nothing is read twice.
// Phone numbers never get in here: the model has no use for them.

/** What the bill-pay rules decided for each due bill (lib/rotation/mandate.ts). */
type BillRow = {
  payableId: string;
  distributor: string;
  amountPaise: number;
  decision: "pay" | "hold";
  reason: string;
  needsMorePaise: number;
};

/**
 * What the bill-pay rules (lib/rotation/mandate.ts) decide for each due bill: with today's money
 * in hand, and if the late payers pay first.
 */
export type BillLimitFacts = {
  mandate: { weeklyLimitPaise: number; keepInHandPaise: number } | null;
  limitLeftPaise: number;
  decisions: BillRow[];
  ifCollected: BillRow[];
};

/** How the last plan went: what it asked to collect, and how much of that has come in since. */
export type LastPlan = { at: string; actions: string[]; askedToCollect: number; paidSince: number };

export function plannerFacts(input: {
  data: ShopData;
  festival: FestivalOrder | null;
  repaidTarunBefore: boolean;
  billLimit: BillLimitFacts | null;
  lastPlan: LastPlan | null;
}) {
  const { data, festival } = input;
  const snapshot = snapshotOf(data);
  const { week } = snapshot;
  const weekEnd = addDays(data.today, 7);

  const latePayers = collectOrder(snapshot.positions)
    .filter((p) => p.status.kind === "late")
    .map((p) => ({
      customerId: p.customerId,
      name: p.name,
      owesPaise: p.balancePaise,
      usualDays: p.status.kind === "late" ? Math.round(p.status.usualDays) : 0,
      daysLate: p.status.kind === "late" ? Math.round(p.status.daysLate) : 0,
      label: p.label,
    }));

  const bills = data.payables
    .filter((p) => !p.paid && p.kind === "supplier_bill" && p.dueDate <= weekEnd)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((p) => ({
      payableId: p.id,
      distributor: p.distributor,
      billNumber: p.billNumber,
      amountPaise: p.amountPaise,
      dueInDays: Math.max(0, daysBetween(data.today, p.dueDate)),
      overdueDays: overdueDays(p.dueDate, data.today),
      festivalOrder: festival?.payableId === p.id,
    }));

  const reorder = reorderPlan(snapshot.items, data.receipts).map((group) => ({
    distributorId: group.distributorId,
    distributor: group.distributor,
    totalPaise: group.totalPaise,
    lines: group.lines.length,
  }));

  const figures = festival ? loanFigures(data, festival, festival.totalPaise) : null;
  const band =
    figures && figures.loanNeededPaise > 0
      ? mudraBand(figures.loanNeededPaise, input.repaidTarunBefore)
      : null;
  const festivalDue = festival?.payableId
    ? data.payables.find((p) => p.id === festival.payableId && !p.paid)
    : undefined;

  return {
    asOf: indiaTime(data.now),
    today: data.today,
    week: {
      state: week.state,
      gapPaise: week.gapPaise,
      neededPaise: week.needed.paise,
      likelyPaise: week.likely.paise,
      inHandPaise: week.likely.now.paise,
      latePaise: week.late.paise,
      label: weakest(week.needed.due.label, week.likely.now.label, week.likely.sales.label),
    },
    latePayers,
    bills,
    low: snapshot.items
      .filter((item) => item.tags.includes("low"))
      .map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        daysLeft: item.daysLeft,
      })),
    reorder,
    loan: {
      festival:
        festival && festival.payableId
          ? {
              payableId: festival.payableId,
              festival: festival.festival,
              distributor: festival.distributor,
              totalPaise: festival.totalPaise,
              dueThisWeek: festivalDue !== undefined && festivalDue.dueDate <= weekEnd,
            }
          : null,
      gapWithoutOrderPaise: figures?.gapWithoutOrderPaise ?? week.gapPaise,
      canCollectPaise: figures?.canCollectPaise ?? week.late.paise,
      loanNeededPaise: figures?.loanNeededPaise ?? 0,
      band: band?.covered ? band.band.key : null,
      label: "estimate" as SourceLabel,
    },
    billLimit: input.billLimit,
    lastPlan: input.lastPlan,
  };
}

export type PlannerFacts = ReturnType<typeof plannerFacts>;

/** The short working memory a run starts from; the tools give detail when asked. */
export function summaryOf(facts: PlannerFacts) {
  return {
    as_of: facts.asOf,
    week_state: facts.week.state,
    gap_paise: facts.week.gapPaise,
    money_in_hand_paise: facts.week.inHandPaise,
    late_payers: facts.latePayers.length,
    bills_due_this_week: facts.bills.length,
    low_items: facts.low.length,
    festival_order: facts.loan.festival !== null,
    bill_limit_set: facts.billLimit?.mandate != null,
    last_plan: facts.lastPlan
      ? {
          at: facts.lastPlan.at,
          actions: facts.lastPlan.actions,
          asked_to_collect: facts.lastPlan.askedToCollect,
          paid_since: facts.lastPlan.paidSince,
        }
      : null,
  };
}
