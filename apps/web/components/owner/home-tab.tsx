"use client";

import {
  ArrowRight,
  ChevronDown,
  HandCoins,
  House,
  IndianRupee,
  Landmark,
  Mic,
  Package,
  ReceiptText,
  RefreshCw,
  ScanLine,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useLive } from "@/components/owner/live";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Failed, Loading } from "@/components/owner/screen-state";
import { Section } from "@/components/owner/section";
import { RotationSourceSheet } from "@/components/owner/source-sheet";
import { SourceBadge } from "@/components/owner/source-badge";
import type { OwnerTab } from "@/components/owner/tab-bar";
import { TabHeader } from "@/components/owner/tab-header";
import { useDates } from "@/components/owner/use-dates";
import { useDay } from "@/components/owner/use-day";
import { Amount } from "@/components/ui/amount";
import { IconCircle, type IconTone } from "@/components/ui/icon-circle";
import { ListRow } from "@/components/ui/list-row";
import { HeroCard } from "@/components/ui/promo-card";
import { Ticker } from "@/components/ui/ticker";
import { Tile } from "@/components/ui/tile";
import { langInfo } from "@/lib/i18n/languages";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { ownerApi } from "@/lib/owner/api";
import type { SourceLabel } from "@/lib/rotation/labels";
import type { RotationPart } from "@/lib/rotation/sources";

/**
 * A1, A2 and the measured value (11a): this week's verdict first, then where the money sits and
 * every part of the week. Each number opens the rows it came from (E3).
 */
export function HomeTab({ onTab }: { onTab: (tab: OwnerTab) => void }) {
  const { lang, text } = useOwnerLanguage();
  const { openAgent } = useOwnerScreen();
  const dates = useDates();
  const day = useDay(text, langInfo[lang].sarvamCode);
  const rotation = useLive(ownerApi.rotation, ["rotation", "credit", "stock"]);
  const value = useLive(ownerApi.value, ["rotation", "credit"]);
  const [part, setPart] = useState<RotationPart | null>(null);
  const [detail, setDetail] = useState(false);
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
    icon: LucideIcon,
    tone: IconTone,
    paise: number,
    label: SourceLabel,
    meta?: ReactNode,
  ) => (
    <li key={key}>
      <ListRow
        art={<IconCircle icon={icon} tone={tone} />}
        title={text.parts[key]}
        meta={meta}
        note={<SourceBadge label={label} />}
        trailing={<Amount paise={paise} size="md" />}
        onClick={() => setPart(key)}
      />
    </li>
  );
  const shortcuts: { icon: LucideIcon; tone: IconTone; label: string; open: () => void }[] = [
    {
      icon: HandCoins,
      tone: "lime",
      label: text.shortcuts.collect,
      open: () => openAgent("collect"),
    },
    {
      icon: ShoppingCart,
      tone: "lime",
      label: text.shortcuts.reorder,
      open: () => openAgent("reorder"),
    },
    { icon: ScanLine, tone: "mint", label: text.shortcuts.bill, open: () => onTab("stock") },
    { icon: Landmark, tone: "sky", label: text.shortcuts.loan, open: () => onTab("bank") },
  ];

  return (
    <main className="px-4 pt-2 pb-44">
      <TabHeader title={text.homeTitle} line={day?.date} />

      <HeroCard className="mt-4">
        <p className="text-sm font-semibold text-accent-ink/80">{text.weekState[week.state]}</p>
        <Ticker
          paise={Math.abs(week.gap_paise)}
          className="mt-1 block text-hero font-extrabold tracking-tight"
        />
        <p className="mt-2 text-sm text-accent-ink/85">
          {text.neededLikely(formatMoney(week.needed.paise), formatMoney(week.likely.paise))}
        </p>
        <p className="text-xs text-accent-ink/70">
          {text.weekRange(dates.day(week.from), dates.day(week.to))}
        </p>
      </HeroCard>

      {week.late.customers > 0 && (
        <button
          type="button"
          onClick={() => onTab("collect")}
          className="mt-3 flex w-full items-center gap-3 rounded-3xl bg-surface p-3 pr-4 text-left shadow-card transition-transform active:scale-98"
        >
          <IconCircle icon={HandCoins} tone="lilac" size="lg" />
          <span className="min-w-0 flex-1">
            <span className="block text-base leading-snug font-bold">
              {text.collectLate(week.late.customers, formatMoney(week.late.paise))}
            </span>
            <span className="block text-sm text-ink-muted">{text.seeWho}</span>
          </span>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">
            <ArrowRight aria-hidden className="size-5" />
          </span>
        </button>
      )}

      {week.asks.length > 0 && (
        <section className="mt-3 rounded-3xl bg-surface p-4 shadow-card">
          {week.asks.map((ask) => (
            <p key={ask} className="text-base font-semibold">
              {text.asks[ask]}
            </p>
          ))}
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-lime text-lime-ink">
              <Mic aria-hidden className="size-4" />
            </span>
            {text.askHint}
          </p>
        </section>
      )}

      <ul className="mt-6 grid grid-cols-4 gap-2">
        {shortcuts.map((shortcut) => (
          <li key={shortcut.label}>
            <button
              type="button"
              onClick={shortcut.open}
              className="flex w-full flex-col items-center gap-2 text-center transition-transform active:scale-95"
            >
              <span className="rounded-full bg-surface p-1 shadow-card">
                <IconCircle icon={shortcut.icon} tone={shortcut.tone} size="lg" />
              </span>
              <span className="text-xs leading-tight font-semibold">{shortcut.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mt-7 px-1 text-lg leading-snug font-bold">{text.whereMoney}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Tile
          visual={<IconCircle icon={Package} />}
          size="sm"
          className="col-span-2"
          onClick={() => setPart("on_shelf")}
        >
          <p className="pr-16 text-sm text-ink-muted">{text.parts.on_shelf}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {formatMoney(now.on_shelf.paise)}
          </p>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <SourceBadge label={now.on_shelf.label} />
            {now.on_shelf.cost_unknown.length > 0 && (
              <span className="text-xs text-ink-muted">
                {text.costUnknown(now.on_shelf.cost_unknown.length)}
              </span>
            )}
          </span>
        </Tile>
        <Tile
          visual={<IconCircle icon={Users} tone="lilac" size="sm" />}
          size="md"
          onClick={() => setPart("with_customers")}
        >
          <p className="line-clamp-2 pr-12 text-sm text-ink-muted">{text.parts.with_customers}</p>
          <p className="text-xl font-bold tracking-tight tabular-nums">
            {formatMoney(now.with_customers.paise)}
          </p>
          <span className="mt-1 block">
            <SourceBadge label={now.with_customers.label} />
          </span>
        </Tile>
        <Tile
          visual={<IconCircle icon={Truck} tone="sand" size="sm" />}
          size="md"
          onClick={() => setPart("owed_to_suppliers")}
        >
          <p className="line-clamp-2 pr-12 text-sm text-ink-muted">
            {text.parts.owed_to_suppliers}
          </p>
          <p className="text-xl font-bold tracking-tight tabular-nums">
            {formatMoney(now.owed_to_suppliers.paise)}
          </p>
          <span className="mt-1 block">
            <SourceBadge label={now.owed_to_suppliers.label} />
          </span>
        </Tile>
      </div>

      <button
        type="button"
        aria-expanded={detail}
        onClick={() => setDetail((open) => !open)}
        className="mt-6 flex min-h-14 w-full items-center justify-between gap-3 rounded-full bg-surface px-5 text-base font-semibold shadow-card transition-transform active:scale-98"
      >
        {detail ? text.hideDetails : text.weekDetails}
        <ChevronDown
          aria-hidden
          className={cn("size-5 shrink-0 transition-transform", detail && "rotate-180")}
        />
      </button>

      {detail && (
        <>
          <Section title={text.neededTitle} total={week.needed.paise}>
            {row(
              "due_7d",
              ReceiptText,
              "sand",
              due.paise,
              due.label,
              text.billsDue(
                due.bills,
                due.overdue_paise > 0 ? formatMoney(due.overdue_paise) : null,
              ),
            )}
            {row("weekly_costs", House, "sand", costs.paise, costs.label, text.costsMeta)}
          </Section>

          <Section title={text.likelyTitle} total={week.likely.paise}>
            {row(
              "money_now",
              Wallet,
              "mint",
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
              Store,
              "mint",
              sales.paise,
              sales.label,
              text.daysUsed(sales.days_used),
            )}
            {row(
              "from_customers",
              HandCoins,
              "mint",
              customers.paise,
              customers.label,
              text.customersDue(customers.customers),
            )}
          </Section>

          {value.data && (
            <Section title={text.valueTitle}>
              <li>
                <ListRow
                  art={<IconCircle icon={IndianRupee} />}
                  title={text.recovered}
                  meta={text.recoveredLine(
                    formatMoney(value.data.late_credit_recovered_30d.verified_paise),
                    formatMoney(value.data.late_credit_recovered_30d.declared_paise),
                  )}
                />
              </li>
              <li>
                <ListRow
                  art={<IconCircle icon={RefreshCw} tone="sky" />}
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
        </>
      )}

      <RotationSourceSheet part={part} onClose={close} />
    </main>
  );
}
