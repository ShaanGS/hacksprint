"use client";

import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { SourceSheet } from "@/components/owner/source-sheet";
import { useDay } from "@/components/owner/use-day";
import { useHome } from "@/components/owner/use-home";
import { Amount } from "@/components/ui/amount";
import { Art, type ArtName } from "@/components/ui/art";
import { FeatureCard } from "@/components/ui/feature-card";
import { ListRow } from "@/components/ui/list-row";
import { Ticker } from "@/components/ui/ticker";
import { langInfo } from "@/lib/i18n/languages";
import type { OwnerBackend } from "@/lib/owner/backend";
import type { HomeNumbers, HomeSource, HomeSourceKind } from "@/lib/sources/types";

const money: { kind: HomeSourceKind; art: ArtName; key: keyof HomeNumbers }[] = [
  { kind: "collected", art: "savings", key: "collectedPaise" },
  { kind: "owed-to-shop", art: "khata", key: "owedToShopPaise" },
  { kind: "owed-by-shop", art: "crate", key: "owedByShopPaise" },
];

/**
 * O5, spec E1 and E3: the day in four numbers, every one of them a button that opens the rows it
 * came from. The hero is what the voice page took while the owner was busy.
 */
export function HomeTab({ backend }: { backend: OwnerBackend }) {
  const { lang, text } = useOwnerLanguage();
  const numbers = useHome(backend);
  const day = useDay(text, langInfo[lang].sarvamCode);
  const [kind, setKind] = useState<HomeSourceKind | null>(null);
  const [source, setSource] = useState<HomeSource | null>(null);

  function open(next: HomeSourceKind) {
    setKind(next);
    setSource(null);
    backend.homeSource(next).then(setSource, () => setKind(null));
  }

  const labels: Record<HomeSourceKind, string> = {
    orders: text.sourceTitles.orders,
    collected: text.collectedToday,
    "owed-to-shop": text.owedToShop,
    "owed-by-shop": text.owedByShop,
  };
  if (!numbers) {
    return (
      <div className="grid h-full place-items-center">
        <Art name="savings" size={120} eager />
      </div>
    );
  }
  return (
    <main className="px-4 pt-6 pb-32">
      <p className="h-5 text-sm font-semibold text-ink-muted">{day?.date}</p>
      <h1 className="text-title font-extrabold tracking-tight">{text.tabs.home}</h1>
      <p className="mt-1 text-base text-ink-muted">{text.seeWhere}</p>

      <FeatureCard
        banner="voice"
        title={text.savedTitle}
        action={text.sourceTitles.orders}
        onClick={() => open("orders")}
        className="mt-4"
      >
        <Ticker
          paise={numbers.ordersPaise}
          className="mt-1 block text-hero font-extrabold tracking-tight"
        />
        <p className="text-base text-accent-ink/85">{text.savedText(numbers.ordersCount)}</p>
      </FeatureCard>

      <ul className="-mx-3 mt-4">
        {money.map((item) => (
          <li key={item.kind}>
            <ListRow
              art={<Art name={item.art} size={56} />}
              title={labels[item.kind]}
              trailing={<Amount paise={numbers[item.key]} size="md" />}
              onClick={() => open(item.kind)}
            />
          </li>
        ))}
      </ul>

      <SourceSheet kind={kind} source={source} onClose={() => setKind(null)} />
    </main>
  );
}
