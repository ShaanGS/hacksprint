"use client";

import {
  ArrowRight,
  ChevronDown,
  HandCoins,
  House,
  IndianRupee,
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
import { Badge } from "@/components/ui/badge";
import { IconCircle, type IconTone } from "@/components/ui/icon-circle";
import { ListRow } from "@/components/ui/list-row";
import { Ticker } from "@/components/ui/ticker";
import { agentWordsFor } from "@/lib/i18n/agents";
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
  const agentWords = agentWordsFor(lang);
  const dates = useDates();
  const day = useDay(text, langInfo[lang].sarvamCode);
  const rotation = useLive(ownerApi.rotation, ["rotation", "credit", "stock"]);
  const value = useLive(ownerApi.value, ["rotation", "credit"]);
  const [part, setPart] = useState<RotationPart | null>(null);
  const [detail, setDetail] = useState(false);
  const close = useCallback(() => setPart(null), []);

  if (!rotation.data) {
    return rotation.failed ? <Failed onRetry={rotation.reload} /> : <Loading />;
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
  return (
    <main className="px-4 pt-2 pb-44">
      <TabHeader title={text.homeTitle} line={day?.date} />

      <section className="mt-5">
        <Badge
          tone={week.state === "short" ? "danger" : week.state === "close" ? "warning" : "success"}
        >
          {text.weekState[week.state]}
        </Badge>
        <Ticker
          paise={Math.abs(week.gap_paise)}
          className="mt-2 block text-hero font-extrabold tracking-tight"
        />
        <p className="mt-1 text-sm text-ink-muted">
          {text.neededLikely(formatMoney(week.needed.paise), formatMoney(week.likely.paise))}
          {" · "}
          {text.weekRange(dates.day(week.from), dates.day(week.to))}
        </p>
      </section>

      <div className="mt-5 flex items-center gap-2">
        <PillAction icon={HandCoins} onClick={() => openAgent("collect")}>
          {text.shortcuts.collect}
        </PillAction>
        <PillAction icon={ShoppingCart} onClick={() => openAgent("reorder")}>
          {text.shortcuts.reorder}
        </PillAction>
        <RoundAction icon={ScanLine} label={text.shortcuts.bill} onClick={() => onTab("stock")} />
      </div>

      {week.late.customers > 0 && (
        <section className="relative mt-5 overflow-hidden rounded-3xl bg-indigo p-5 text-night-ink">
          <span
            aria-hidden
            className="absolute -top-16 -right-12 size-44 rounded-full bg-night-ink/10"
          />
          <p className="relative text-xl leading-snug font-bold">
            {text.collectLate(week.late.customers, formatMoney(week.late.paise))}
          </p>
          <p className="relative mt-1 text-sm text-night-ink/80">{agentWords.collectHint}</p>
          <button
            type="button"
            onClick={() => openAgent("collect")}
            className="relative mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-yellow px-5 text-base font-semibold text-yellow-ink transition-transform active:scale-98"
          >
            {agentWords.letAgentCollect}
            <ArrowRight aria-hidden className="size-5" />
          </button>
        </section>
      )}

      {week.asks.length > 0 && (
        <section className="mt-3 rounded-3xl bg-surface p-4 shadow-card">
          {week.asks.map((ask) => (
            <p key={ask} className="text-base font-semibold">
              {text.asks[ask]}
            </p>
          ))}
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-yellow text-yellow-ink">
              <Mic aria-hidden className="size-4" />
            </span>
            {text.askHint}
          </p>
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-lg leading-snug font-bold">{text.whereMoney}</h2>
          <button
            type="button"
            aria-expanded={detail}
            onClick={() => setDetail((open) => !open)}
            className="flex min-h-11 items-center gap-1 text-sm font-semibold text-accent"
          >
            {detail ? text.hideDetails : text.weekDetails}
            <ChevronDown
              aria-hidden
              className={cn("size-4 transition-transform", detail && "rotate-180")}
            />
          </button>
        </div>
        <ul className="mt-2 divide-y divide-border rounded-3xl bg-surface p-1 shadow-card">
          {row(
            "on_shelf",
            Package,
            "mint",
            now.on_shelf.paise,
            now.on_shelf.label,
            now.on_shelf.cost_unknown.length > 0
              ? text.costUnknown(now.on_shelf.cost_unknown.length)
              : undefined,
          )}
          {row(
            "with_customers",
            Users,
            "lilac",
            now.with_customers.paise,
            now.with_customers.label,
          )}
          {row(
            "owed_to_suppliers",
            Truck,
            "sand",
            now.owed_to_suppliers.paise,
            now.owed_to_suppliers.label,
          )}
        </ul>
      </section>

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

function PillAction({
  icon: Icon,
  onClick,
  children,
}: {
  icon: LucideIcon;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-yellow px-4 text-base font-semibold text-yellow-ink transition-transform active:scale-98"
    >
      <Icon aria-hidden className="size-5 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  );
}

function RoundAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-12 shrink-0 place-items-center rounded-full bg-yellow text-yellow-ink transition-transform active:scale-95"
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
