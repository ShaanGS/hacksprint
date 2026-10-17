import { useSyncExternalStore } from "react";

// The phone's clock, read only in the browser: the server renders without a greeting, so the
// page never disagrees with itself while it loads.
const neverChanges = () => () => {};

type Greetings = { morning: string; afternoon: string; evening: string };

function greetingFor(hour: number, words: Greetings): string {
  if (hour < 12) return words.morning;
  if (hour < 17) return words.afternoon;
  return words.evening;
}

/** "Good evening" and "Friday, 17 October" in the owner's language, or null on the server. */
export function useDay(
  words: Greetings,
  locale: string,
): { greeting: string; date: string } | null {
  const greeting = useSyncExternalStore(
    neverChanges,
    () => greetingFor(new Date().getHours(), words),
    () => null,
  );
  const date = useSyncExternalStore(
    neverChanges,
    () => new Date().toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" }),
    () => null,
  );
  return greeting && date ? { greeting, date } : null;
}
