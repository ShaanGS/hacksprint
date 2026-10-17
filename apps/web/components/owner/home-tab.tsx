"use client";

import { ChevronRight, Mic } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useLive } from "@/components/owner/live";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Failed, Loading } from "@/components/owner/screen-state";
import { Section } from "@/components/owner/section";
import { RotationSourceSheet } from "@/components/owner/source-sheet";
import { SourceBadge } from "@/components/owner/source-badge";
import { TabHeader } from "@/components/owner/tab-header";
import { TrackDays } from "@/components/owner/track-days";
import { useDates } from "@/components/owner/use-dates";
import { useDay } from "@/components/owner/use-day";
import { Amount } from "@/components/ui/amount";
import { Art, type ArtName } from "@/components/ui/art";
import { FeatureCard } from "@/components/ui/feature-card";
import { ListRow } from "@/components/ui/list-row";
import { Ticker } from "@/components/ui/ticker";
import { langInfo } from "@/lib/i18n/languages";
import { formatMoney } from "@/lib/money";
import { ownerApi } from "@/lib/owner/api";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { RotationPart } from "@/lib/rotation/sources";

/**
 * Screen E · Track days (owner) + Week overview (A1, A2).
 * Shows black background, 7 rounded bars Mon–Sun from real sales,
 * cream #f4f1e8 bottom sheet "Top sellers" with bars; low-stock items in red with "reorder".
 */
export function HomeTab({ onCollect, onStock }: { onCollect: () => void; onStock?: () => void }) {
  const { lang, text } = useOwnerLanguage();
  const isTa = lang === "ta";
  const dates = useDates();
  const day = useDay(text, langInfo[lang].sarvamCode);
  const rotation = useLive(ownerApi.rotation, ["rotation", "credit", "stock"]);
  const value = useLive(ownerApi.value, ["rotation", "credit"]);
  const [part, setPart] = useState<RotationPart | null>(null);
  const [view, setView] = useState<"track" | "breakdown">("track");
  const close = useCallback(() => setPart(null), []);

  if (!rotation.data) {
    return rotation.failed ? (
      <Failed art="savings" onRetry={rotation.reload} />
    ) : (
      <Loading art="savings" />
    );
  }

  const { now, week } = rotation.data;
  const [due, costs] = week.needed.parts;
  const [inHand, sales, customers] = week.likely.parts;

  const row = (
    key: RotationPart,
    art: ArtName,
    paise: number,
    label: SourceLabel,
    meta?: ReactNode,
  ) => (
    <li key={key}>
      <ListRow
        art={<Art name={art} size={56} />}
        title={text.parts[key]}
        meta={meta}
        note={<SourceBadge label={label} />}
        trailing={<Amount paise={paise} size="md" />}
        onClick={() => setPart(key)}
      />
    </li>
  );

  return (
    <main className="min-h-full bg-black text-white pb-44">
      {/* View Switcher Pill */}
      <div className="flex justify-center px-4 pt-3 pb-1">
        <div className="inline-flex rounded-full bg-[#1c1c1e] p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setView("track")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              view === "track"
                ? "bg-[#b9a7f5] text-black shadow-xs"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {isTa ? "விற்பனை வரைபடம்" : "Sales this week"}
          </button>
          <button
            type="button"
            onClick={() => setView("breakdown")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              view === "breakdown"
                ? "bg-[#b9a7f5] text-black shadow-xs"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {isTa ? "பண சுழற்சி" : "Cash rotation"}
          </button>
        </div>
      </div>

      {view === "track" ? (
        /* Screen E Track Days view */
        <TrackDays onReorder={() => onStock?.()} />
      ) : (
        /* Detailed Rotation Breakdown */
        <div className="px-4 pt-2">
          <TabHeader title={text.homeTitle} line={day?.date} />

          <FeatureCard banner="night" title={text.weekState[week.state]} className="mt-4">
            <Ticker
              paise={Math.abs(week.gap_paise)}
              className="mt-1 block text-hero font-extrabold tracking-tight"
            />
            <p className="text-base text-accent-ink/85">
              {text.neededLikely(formatMoney(week.needed.paise), formatMoney(week.likely.paise))}
            </p>
            <p className="text-sm text-accent-ink/70">
              {text.weekRange(dates.day(week.from), dates.day(week.to))}
            </p>
          </FeatureCard>

          {week.late.customers > 0 && (
            <button
              type="button"
              onClick={onCollect}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-surface-muted p-3 text-left transition-transform active:scale-98"
            >
              <Art name="khata" size={56} />
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">
                  {text.collectLate(week.late.customers, formatMoney(week.late.paise))}
                </span>
                <span className="block text-sm text-ink-muted">{text.seeWho}</span>
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0" />
            </button>
          )}

          {week.asks.length > 0 && (
            <section className="mt-3 rounded-2xl bg-surface-muted p-4">
              {week.asks.map((ask) => (
                <p key={ask} className="text-base font-semibold">
                  {text.asks[ask]}
                </p>
              ))}
              <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
                <Mic aria-hidden className="size-4 shrink-0" />
                {text.askHint}
              </p>
            </section>
          )}

          <Section title={text.whereMoney}>
            {row(
              "on_shelf",
              "crate",
              now.on_shelf.paise,
              now.on_shelf.label,
              now.on_shelf.cost_unknown.length > 0
                ? text.costUnknown(now.on_shelf.cost_unknown.length)
                : undefined,
            )}
            {row("with_customers", "khata", now.with_customers.paise, now.with_customers.label)}
            {row(
              "owed_to_suppliers",
              "bill",
              now.owed_to_suppliers.paise,
              now.owed_to_suppliers.label,
            )}
          </Section>

          <Section title={text.neededTitle} total={week.needed.paise}>
            {row(
              "due_7d",
              "bill",
              due.paise,
              due.label,
              text.billsDue(
                due.bills,
                due.overdue_paise > 0 ? formatMoney(due.overdue_paise) : null,
              ),
            )}
            {row("weekly_costs", "coins", costs.paise, costs.label, text.costsMeta)}
          </Section>

          <Section title={text.likelyTitle} total={week.likely.paise}>
            {row(
              "money_now",
              "savings",
              inHand.paise,
              inHand.label,
              inHand.said_at
                ? [
                    text.saidAt(dates.dayAndTime(inHand.said_at)),
                    inHand.verified_after_paise > 0 &&
                      text.paidSince(formatMoney(inHand.verified_after_paise)),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : text.notSaidLately,
            )}
            {row(
              "usual_week_sales",
              "shop",
              sales.paise,
              sales.label,
              text.daysUsed(sales.days_used),
            )}
            {row(
              "from_customers",
              "phone-pay",
              customers.paise,
              customers.label,
              text.customersDue(customers.customers),
            )}
          </Section>

          {value.data && (
            <Section title={text.valueTitle}>
              <li>
                <ListRow
                  art={<Art name="coins" size={56} />}
                  title={text.recovered}
                  meta={text.recoveredLine(
                    formatMoney(value.data.late_credit_recovered_30d.verified_paise),
                    formatMoney(value.data.late_credit_recovered_30d.declared_paise),
                  )}
                />
              </li>
              <li>
                <ListRow
                  art={<Art name="clock" size={56} />}
                  title={text.cycle}
                  meta={text.cycleLine(
                    value.data.money_cycle_days.now,
                    value.data.money_cycle_days.first_weeks,
                  )}
                  note={text.cycleMeaning}
                />
              </li>
            </Section>
          )}

          <RotationSourceSheet part={part} onClose={close} />
        </div>
      )}
    </main>
  );
}
