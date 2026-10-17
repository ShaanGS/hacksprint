"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useLive } from "@/components/owner/live";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { useOwnerScreen } from "@/components/owner/owner-screen";
import { SourceBadge } from "@/components/owner/source-badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { IconCircle } from "@/components/ui/icon-circle";
import { KEEP_IN_HAND_PAISE, WEEKLY_LIMITS_PAISE } from "@/lib/bill-pay/limits";
import { billPayWordsFor } from "@/lib/i18n/bill-pay";
import { formatMoney } from "@/lib/money";
import { billPayApi } from "@/lib/owner/bill-pay-api";

/**
 * The owner's mandate for the bill-pay agent, set by tapping chips: how much it may pay in any 7
 * days and how much always stays in hand. Nothing is saved until he taps "Save the limit", and
 * Stop ends it at once.
 */
export function BillLimitCard() {
  const { lang, text } = useOwnerLanguage();
  const { notify } = useOwnerScreen();
  const words = billPayWordsFor(lang);
  const live = useLive(billPayApi.mandate, ["rotation"]);
  const [weekly, setWeekly] = useState<number | null>(null);
  const [keep, setKeep] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Until he taps a chip, the chips show the limit he has now.
  const mandate = live.data?.mandate ?? null;
  const chosenWeekly = weekly ?? mandate?.weekly_limit_paise ?? null;
  const chosenKeep = keep ?? mandate?.keep_in_hand_paise ?? null;
  const changed =
    chosenWeekly !== null &&
    chosenKeep !== null &&
    (chosenWeekly !== mandate?.weekly_limit_paise || chosenKeep !== mandate?.keep_in_hand_paise);

  async function act(work: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await work();
      notify(done);
      live.reload();
    } catch {
      notify(text.failed);
    } finally {
      setBusy(false);
    }
  }

  // After Stop no chip stays picked, so a new limit is two clear taps away.
  function stop() {
    setWeekly(null);
    setKeep(null);
    return act(billPayApi.stopMandate, words.stopped);
  }

  // Without the mandate (say, the database is not reachable) the rest of the Bank tab still works.
  if (!live.data) return null;
  return (
    <section className="mt-4 rounded-3xl bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <IconCircle icon={ShieldCheck} tone="yellow" size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">{words.cardTitle}</p>
          <p className="text-sm text-ink-muted">{words.cardText}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mandate ? (
          <>
            <p className="text-base font-semibold">
              {words.current(
                formatMoney(mandate.weekly_limit_paise),
                formatMoney(mandate.keep_in_hand_paise),
              )}
            </p>
            <SourceBadge label={mandate.label} />
          </>
        ) : (
          <p className="text-base text-ink-muted">{words.notSet}</p>
        )}
      </div>
      <ChipRow
        label={words.weeklyLabel}
        values={WEEKLY_LIMITS_PAISE}
        chosen={chosenWeekly}
        onPick={setWeekly}
      />
      <ChipRow
        label={words.keepLabel}
        values={KEEP_IN_HAND_PAISE}
        chosen={chosenKeep}
        onPick={setKeep}
      />
      <div className="mt-4 space-y-2">
        <Button
          wide
          variant="yellow"
          disabled={busy || !changed}
          onClick={() =>
            chosenWeekly !== null &&
            chosenKeep !== null &&
            act(() => billPayApi.setMandate(chosenWeekly, chosenKeep), words.saved)
          }
        >
          {words.save}
        </Button>
        {mandate && (
          <Button wide variant="soft" disabled={busy} onClick={stop}>
            {words.stop}
          </Button>
        )}
      </div>
    </section>
  );
}

function ChipRow({
  label,
  values,
  chosen,
  onPick,
}: {
  label: string;
  values: readonly number[];
  chosen: number | null;
  onPick: (value: number) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <Chip key={value} on={chosen === value} onClick={() => onPick(value)}>
            {formatMoney(value)}
          </Chip>
        ))}
      </div>
    </div>
  );
}
