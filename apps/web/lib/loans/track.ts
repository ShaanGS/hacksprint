import { daysBetween } from "@/lib/time";

// The loan tracker's rules, pure: which step the owner may tap next, when each EMI falls, and
// what to keep aside tonight for the next one (spec 9.16). He taps every step himself; the bank
// tells him, not us. Every amount here is his own word (owner_said) or arithmetic on it.

export const loanStatuses = [
  "applied",
  "docs_asked",
  "sanctioned",
  "disbursed",
  "rejected",
] as const;
export type LoanStatus = (typeof loanStatuses)[number];

/** The steps a loan goes through, in order; "rejected" can end any step before disbursal. */
const next: Record<LoanStatus, LoanStatus[]> = {
  applied: ["docs_asked", "sanctioned", "rejected"],
  docs_asked: ["sanctioned", "rejected"],
  sanctioned: ["disbursed", "rejected"],
  disbursed: [],
  rejected: [],
};

export function nextSteps(status: LoanStatus): LoanStatus[] {
  return next[status];
}

export function canMove(from: LoanStatus, to: LoanStatus): boolean {
  return next[from].includes(to);
}

/** EMIs fall on the same day each month, from the month after disbursal; day 29 to 31 is 28. */
export function emiDueDates(disbursedOn: string, months: number): string[] {
  const [year, month, day] = disbursedOn.split("-").map(Number);
  const emiDay = Math.min(day, 28);
  return Array.from({ length: months }, (_, index) => {
    const due = new Date(Date.UTC(year, month - 1 + index + 1, emiDay));
    return due.toISOString().slice(0, 10);
  });
}

/** How far ahead of an EMI the nightly set-aside starts: the week the forecast already covers. */
export const SET_ASIDE_DAYS = 7;
const ROUND_TO_PAISE = 1_000;
/** A very slow or very busy day moves tonight's figure at most this much either way. */
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

export type SetAsideInput = {
  emiPaise: number;
  keptPaise: number;
  dueDate: string;
  today: string;
  /** Today's sales so far; null when he has not said tonight's cash yet. */
  todaySalesPaise: number | null;
  /** A usual day's sales; 0 when there is not enough history to know one. */
  usualDayPaise: number;
};

/**
 * Tonight's set-aside (9.16): what is still not kept aside, over the days left, scaled by today's
 * sales against a usual day, rounded up to ₹10, never more than what remains. On the last night
 * (or once the EMI is due) it is all that remains. Zero until the EMI is within the week.
 */
export function setAsideTonight(input: SetAsideInput) {
  const remainingPaise = Math.max(0, input.emiPaise - input.keptPaise);
  const daysLeft = Math.max(1, daysBetween(input.today, input.dueDate));
  const started = daysBetween(input.today, input.dueDate) <= SET_ASIDE_DAYS;
  if (remainingPaise === 0 || !started) {
    return { tonightPaise: 0, remainingPaise, daysLeft, started, scale: 1 };
  }
  const scale =
    input.todaySalesPaise === null || input.usualDayPaise <= 0
      ? 1
      : Math.min(MAX_SCALE, Math.max(MIN_SCALE, input.todaySalesPaise / input.usualDayPaise));
  const even = remainingPaise / daysLeft;
  const rounded = Math.ceil((even * scale) / ROUND_TO_PAISE) * ROUND_TO_PAISE;
  const tonightPaise = daysLeft === 1 ? remainingPaise : Math.min(rounded, remainingPaise);
  return { tonightPaise, remainingPaise, daysLeft, started, scale };
}
