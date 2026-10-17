// The shop's day runs on India time, wherever the server is.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Midnight at the start of today in India, as an instant. */
export function startOfShopDay(now = new Date()): Date {
  const india = new Date(now.getTime() + IST_OFFSET_MS);
  const midnight = Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), india.getUTCDate());
  return new Date(midnight - IST_OFFSET_MS);
}

/** The shop's calendar date of an instant, "2026-10-18", in India time. */
export function shopDate(instant: Date | string): string {
  const at = typeof instant === "string" ? new Date(instant) : instant;
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** A calendar date some days later (or earlier, for a negative count). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole calendar days from one date to another; negative when `to` comes first. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** Weeks between two instants, with the fraction: stock moves with time, not with dates. */
export function weeksBetween(from: Date | string, to: Date | string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / WEEK_MS;
}

/** "2026-09" for a shop date. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** The full months before the shop's current month, oldest first: "2026-07" and on. */
export function lastFullMonths(today: string, count: number): string[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const back = new Date(Date.UTC(year, month - 1 - (count - index), 1));
    return back.toISOString().slice(0, 7);
  });
}

/** The time as a phone's status bar shows it, in India: "9:41", 12 hour, no AM or PM. */
export function phoneClock(now = new Date()): string {
  const india = new Date(now.getTime() + IST_OFFSET_MS);
  const hours = india.getUTCHours() % 12 || 12;
  const minutes = String(india.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
