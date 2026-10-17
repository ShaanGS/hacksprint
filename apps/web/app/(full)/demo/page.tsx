import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { LiveRefresh } from "@/components/demo/live-refresh";
import { Art, type ArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Monogram } from "@/components/ui/monogram";
import { demoMode } from "@/lib/env";
import { moneyTextFor } from "@/lib/i18n/money";
import { formatMoney } from "@/lib/money";
import { openReminders } from "@/lib/reminders/remind";
import { loadShopData } from "@/lib/rotation/load";
import { collectResponse, rotationResponse } from "@/lib/rotation/responses";
import { snapshotOf } from "@/lib/rotation/snapshot";
import { getShop } from "@/lib/shop";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "This week", robots: { index: false } };

const text = moneyTextFor("en");

/**
 * The judges' screen (spec section 7): where the money is (A1), this week (A2) and who to collect
 * from (A3), large, refreshed live as the owner's phone changes them. Rendered on the server, so
 * no key reaches the browser; it exists only while the shop runs on demo data.
 */
export default async function DemoPage() {
  if (!demoMode()) notFound();
  await connection();
  const db = createServiceClient();
  const shop = await getShop(db);
  const [data, reminders] = await Promise.all([
    loadShopData(db, shop.id),
    openReminders(db, shop.id),
  ]);
  const snapshot = snapshotOf(data);
  const { now, week } = rotationResponse(snapshot, data.now, true);
  const { customers } = collectResponse(snapshot, reminders);
  const day = (date: string) =>
    new Date(`${date}T12:00:00+05:30`).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <LiveRefresh shopId={shop.id} />
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-muted">{shop.name}</p>
          <h1 className="text-display font-extrabold tracking-tight">{text.homeTitle}</h1>
        </div>
        <Badge>{text.demoData}</Badge>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="rounded-3xl bg-accent p-6 text-accent-ink">
            <p className="text-xl font-bold">{text.weekState[week.state]}</p>
            <p className="text-display font-extrabold tracking-tight tabular-nums">
              {formatMoney(Math.abs(week.gap_paise))}
            </p>
            <p className="text-lg text-accent-ink/85">
              {text.neededLikely(formatMoney(week.needed.paise), formatMoney(week.likely.paise))}
            </p>
            <p className="text-base text-accent-ink/70">
              {text.weekRange(day(week.from), day(week.to))}
            </p>
            {week.late.customers > 0 && (
              <p className="mt-4 rounded-2xl bg-surface/10 px-4 py-3 text-lg font-semibold">
                {text.collectLate(week.late.customers, formatMoney(week.late.paise))}
              </p>
            )}
          </section>

          <ul className="grid gap-3 sm:grid-cols-3">
            <Stat
              art="crate"
              title={text.parts.on_shelf}
              paise={now.on_shelf.paise}
              label={text.labels[now.on_shelf.label]}
            />
            <Stat
              art="khata"
              title={text.parts.with_customers}
              paise={now.with_customers.paise}
              label={text.labels[now.with_customers.label]}
            />
            <Stat
              art="bill"
              title={text.parts.owed_to_suppliers}
              paise={now.owed_to_suppliers.paise}
              label={text.labels[now.owed_to_suppliers.label]}
            />
          </ul>

          <ul className="space-y-2 rounded-3xl bg-surface-muted p-5 text-lg">
            {[...week.needed.parts, ...week.likely.parts].map((part) => (
              <li key={part.key} className="flex items-baseline justify-between gap-3">
                <span>
                  {text.parts[part.key]}
                  <span className="ml-2 text-sm text-ink-muted">{text.labels[part.label]}</span>
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(part.paise)}</span>
              </li>
            ))}
          </ul>
        </div>

        <section>
          <h2 className="text-2xl font-extrabold tracking-tight">{text.collectTitle}</h2>
          <p className="text-base text-ink-muted">{text.collectOrder}</p>
          <ul className="mt-3 divide-y divide-border">
            {customers.map((customer) => (
              <Row
                key={customer.customer_id}
                name={customer.name}
                late={customer.reason.kind === "late"}
              >
                <p className="text-base text-ink-muted">{text.reason(customer.reason)}</p>
                <span className="text-xl font-bold tabular-nums">
                  {formatMoney(customer.balance_paise)}
                </span>
              </Row>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

function Stat({
  art,
  title,
  paise,
  label,
}: {
  art: ArtName;
  title: string;
  paise: number;
  label: string;
}) {
  return (
    <li className="relative overflow-hidden rounded-2xl bg-surface-muted p-4">
      <Art name={art} size={72} className="absolute -top-2 -right-2" />
      <p className="relative mt-10 text-sm font-semibold text-ink-muted">{title}</p>
      <p className="relative text-2xl font-extrabold tracking-tight tabular-nums">
        {formatMoney(paise)}
      </p>
      <p className="relative text-sm text-ink-muted">{label}</p>
    </li>
  );
}

function Row({ name, late, children }: { name: string; late: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-4 py-3">
      <Monogram name={name} muted={!late} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-lg font-semibold">
          {name}
          {late && <Badge tone="danger">{text.lateBadge}</Badge>}
        </p>
        {children}
      </div>
    </li>
  );
}
