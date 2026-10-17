import { asOf } from "@/lib/rotation/as-of";
import type { ShopData } from "@/lib/rotation/load";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { lateCreditRecovered } from "@/lib/rotation/value";
import { CYCLE_WINDOW_DAYS } from "@/lib/rotation/cycle";

// Measurable value (spec 11a): late credit recovered in 30 days, and money cycle days now against
// the shop's first four weeks of records.

function firstRecord(data: ShopData): Date | null {
  const dates = data.dayCloses.map((d) => d.recordedAt).sort();
  return dates.length > 0 ? new Date(dates[0]) : null;
}

export function valueResponse(data: ShopData) {
  const recovered = lateCreditRecovered(data.customers, data.today);
  const now = snapshotOf(data).cycle;
  const first = firstRecord(data);
  const then = first
    ? snapshotOf(asOf(data, new Date(first.getTime() + CYCLE_WINDOW_DAYS * 86_400_000))).cycle
    : null;
  const days = (value: number | undefined) => (value === undefined ? null : Math.round(value));
  return {
    late_credit_recovered_30d: {
      verified_paise: recovered.verifiedPaise,
      declared_paise: recovered.declaredPaise,
    },
    money_cycle_days: {
      now: days(now?.days),
      first_weeks: days(then?.days),
      label: "estimate",
      freed_per_day_paise: now?.freedPerDayPaise ?? null,
    },
    short_weeks_seen_early: null,
  };
}
