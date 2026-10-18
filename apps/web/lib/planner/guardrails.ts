import type { PlanAction } from "@/lib/rotation/plan-effects";

// The guardrails every plan passes before the owner sees it, whatever the model proposed. The
// model can only suggest: these rules are code (here, in plan.ts and in run.ts), each check is
// saved on the run, and the planner sheet shows what passed, what was stopped and why.

export const guardrailRules = [
  "fixed_actions_only",
  "ids_from_tools",
  "within_owner_limit",
  "collect_first",
  "only_when_needed",
  "one_or_the_other",
  "no_personal_data",
  "inside_budget",
] as const;
export type GuardrailRule = (typeof guardrailRules)[number];

/** Why a step was stopped, and the rule each reason belongs to. */
export const dropReasons = {
  off_schema: "fixed_actions_only",
  repeated: "fixed_actions_only",
  unknown_customer: "ids_from_tools",
  unknown_bill: "ids_from_tools",
  unknown_distributor: "ids_from_tools",
  festival_not_checked: "ids_from_tools",
  loan_not_checked: "ids_from_tools",
  no_bill_fits_limit: "within_owner_limit",
  loan_before_collect: "collect_first",
  no_late_payers: "only_when_needed",
  nothing_to_reorder: "only_when_needed",
  no_festival_order: "only_when_needed",
  no_loan_needed: "only_when_needed",
  order_moved: "one_or_the_other",
} as const satisfies Record<string, GuardrailRule>;
export type DropReason = keyof typeof dropReasons;

/** What code changed instead of stopping a step, and the rule behind it. */
export const fixReasons = {
  collect_moved_first: "collect_first",
  personal_data_removed: "no_personal_data",
  stopped_early: "inside_budget",
} as const satisfies Record<string, GuardrailRule>;
export type FixReason = keyof typeof fixReasons;

/** A bill the owner's limit holds, with the numbers to explain why (all from code). */
export type HeldBill = {
  distributor: string;
  amountPaise: number;
  reason: string;
  needsMorePaise: number;
  dueInDays: number;
  keepPaise: number;
  festival: string | null;
};

export type Dropped = {
  action: PlanAction | null;
  why: DropReason;
  rule: GuardrailRule;
  held?: HeldBill[];
};
export type Fixed = { what: FixReason; rule: GuardrailRule; count: number };

export const stop = (action: PlanAction | null, why: DropReason, held?: HeldBill[]): Dropped => ({
  action,
  why,
  rule: dropReasons[why],
  ...(held && { held }),
});

export const fix = (what: FixReason, count = 1): Fixed => ({
  what,
  rule: fixReasons[what],
  count,
});

export type GuardrailStatus = "passed" | "blocked" | "fixed";
export type GuardrailReport = {
  rules: { rule: GuardrailRule; status: GuardrailStatus; count: number }[];
  blocked: number;
  fixed: number;
  removed: number;
};

/** Every rule with what it did on this run: passed, blocked steps, or fixed something. */
export function guardrailReport(
  stops: readonly Dropped[],
  fixes: readonly Fixed[],
): GuardrailReport {
  const sum = (list: readonly Fixed[]) => list.reduce((total, fix) => total + fix.count, 0);
  return {
    rules: guardrailRules.map((rule) => {
      const blocked = stops.filter((stop) => stop.rule === rule).length;
      const changed = sum(fixes.filter((fix) => fix.rule === rule));
      const status: GuardrailStatus = blocked > 0 ? "blocked" : changed > 0 ? "fixed" : "passed";
      return { rule, status, count: blocked || changed };
    }),
    blocked: stops.length,
    fixed: fixes.filter((fix) => fix.what !== "personal_data_removed").length,
    removed: sum(fixes.filter((fix) => fix.what === "personal_data_removed")),
  };
}

// Text from outside the shop's code (the owner's words, names customers typed, text read from a
// bill photo) arrives as one plain line: no line breaks or control characters to fake a new
// instruction, no direction overrides to hide one, and a length cap.
const CONTROL = /[\p{Cc}‪-‮⁦-⁩]/gu;

export function cleanText(text: string, max: number): string {
  return text.replace(CONTROL, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

// What must never reach the model: Indian mobile numbers (with or without +91 and spaces),
// emails and UPI ids, and Aadhaar-like 12-digit numbers. Only strings are scanned, so amounts,
// which are numbers, are never touched; whole-string UUIDs are skipped, so ids stay intact.
const PERSONAL = [
  /(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)*/g,
  /(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g,
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const REMOVED = "[removed]";

/** A copy of the value with anything personal replaced, and how many were replaced. */
export function scrubPersonalData<T>(value: T): { value: T; removed: number } {
  let removed = 0;
  const scrubText = (text: string) =>
    UUID.test(text)
      ? text
      : PERSONAL.reduce(
          (current, pattern) =>
            current.replace(pattern, () => {
              removed += 1;
              return REMOVED;
            }),
          text,
        );
  const walk = (item: unknown): unknown => {
    if (typeof item === "string") return scrubText(item);
    if (Array.isArray(item)) return item.map(walk);
    if (item !== null && typeof item === "object") {
      return Object.fromEntries(Object.entries(item).map(([key, inner]) => [key, walk(inner)]));
    }
    return item;
  };
  return { value: walk(value) as T, removed };
}

/** True when the text still holds something personal; the attack eval checks what was sent. */
export function holdsPersonalData(text: string): boolean {
  return PERSONAL.some((pattern) => new RegExp(pattern.source).test(text));
}
