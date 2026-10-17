"use client";

import { Bot } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CustomerSheet } from "@/components/owner/customer-sheet";
import { useLive } from "@/components/owner/live";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { Failed, Loading } from "@/components/owner/screen-state";
import { TabHeader } from "@/components/owner/tab-header";
import { Amount } from "@/components/ui/amount";
import { Art } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import { Monogram } from "@/components/ui/monogram";
import { Ticker } from "@/components/ui/ticker";
import { agentWordsFor } from "@/lib/i18n/agents";
import { formatMoney } from "@/lib/money";
import { ownerApi, type CustomerRow } from "@/lib/owner/api";

/**
 * A3 to A5: who to collect from first, each with the reason in plain words. A payment that comes
 * in while the list is open clears its row and says so (A5).
 */
export function CollectTab() {
  const { lang, text } = useOwnerLanguage();
  const { notify, openAgent } = useOwnerScreen();
  const [openId, setOpenId] = useState<string | null>(null);
  const balances = useRef<Map<string, CustomerRow> | null>(null);
  const said = useRef({ notify, paidIn: text.paidIn });
  useEffect(() => {
    said.current = { notify, paidIn: text.paidIn };
  });

  const load = useCallback(async () => {
    const next = await ownerApi.collect();
    const before = balances.current;
    if (before) {
      for (const [id, row] of before) {
        const now = next.customers.find((c) => c.customer_id === id)?.balance_paise ?? 0;
        if (now < row.balance_paise) {
          said.current.notify(said.current.paidIn(row.name, formatMoney(row.balance_paise - now)));
        }
      }
    }
    balances.current = new Map(next.customers.map((c) => [c.customer_id, c]));
    return next;
  }, []);
  const collect = useLive(load, ["credit", "rotation"]);
  const close = useCallback(() => setOpenId(null), []);

  if (!collect.data) {
    return collect.failed ? (
      <Failed art="khata" onRetry={collect.reload} />
    ) : (
      <Loading art="khata" />
    );
  }
  const { customers, late_paise } = collect.data;
  const late = customers.filter((c) => c.reason.kind === "late").length;
  const open = customers.find((c) => c.customer_id === openId) ?? null;
  return (
    <main className="px-4 pt-2 pb-44">
      <TabHeader title={text.collectTitle} />

      <section className="relative mt-4 overflow-hidden rounded-3xl bg-tint-lilac p-5">
        <Art name="khata" size={120} eager className="absolute -top-1 -right-3" />
        <p className="text-sm font-semibold text-ink-muted">{text.parts.late}</p>
        <Ticker paise={late_paise} className="mt-1 block text-hero font-extrabold tracking-tight" />
        <p className="mt-1 max-w-56 text-base text-ink-muted">{text.lateLine(late)}</p>
        {late > 0 && (
          <Button className="mt-4" onClick={() => openAgent("collect")}>
            <Bot aria-hidden className="size-5" />
            {agentWordsFor(lang).letAgentCollect}
          </Button>
        )}
      </section>

      {customers.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <Art name="savings" size={120} />
          <p className="mt-3 text-lg text-ink-muted">{text.nobodyOwes}</p>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm font-semibold text-ink-muted">{text.collectOrder}</p>
          <ul className="-mx-3 mt-1">
            {customers.map((customer) => (
              <li key={customer.customer_id}>
                <ListRow
                  art={<Monogram name={customer.name} muted={customer.reason.kind !== "late"} />}
                  tag={
                    customer.reason.kind === "late" ? (
                      <Badge tone="danger">{text.lateBadge}</Badge>
                    ) : customer.open_reminder ? (
                      <Badge>{text.linkReady}</Badge>
                    ) : undefined
                  }
                  title={customer.name}
                  meta={text.reason(customer.reason)}
                  trailing={<Amount paise={customer.balance_paise} size="lg" />}
                  onClick={() => setOpenId(customer.customer_id)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <CustomerSheet customer={open} onClose={close} />
    </main>
  );
}
