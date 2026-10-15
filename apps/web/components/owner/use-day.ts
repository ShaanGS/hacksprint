import { useSyncExternalStore } from "react";

// The phone's clock, read only in the browser: the server renders without a greeting, so the
// page never disagrees with itself while it loads.
const neverChanges = () => () => {};

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function today(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "Good evening" and "Thursday, 15 October" on the phone's clock, or null on the server. */
export function useDay(): { greeting: string; date: string } | null {
  const greeting = useSyncExternalStore(
    neverChanges,
    () => greetingFor(new Date().getHours()),
    () => null,
  );
  const date = useSyncExternalStore(neverChanges, today, () => null);
  return greeting && date ? { greeting, date } : null;
}
