"use client";

import { useEffect, useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { PlanGuardrails } from "@/components/owner/plan-guardrails";
import { SourceBadge } from "@/components/owner/source-badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Steps, type Step } from "@/components/ui/steps";
import { guardrailWordsFor } from "@/lib/i18n/guardrails";
import { plannerWordsFor, type PlannerWords } from "@/lib/i18n/planner";
import { formatMoney } from "@/lib/money";
import { streamPlan, type PlanResult } from "@/lib/owner/planner-api";

export type PlanTarget = "collect" | "pay" | "reorder" | "bank";
type RailEntry = { name: string; meta: Record<string, unknown> };

/**
 * The planner agent: Gemini reads this week through the shop's own tools and puts the steps in
 * order; the app works out every amount. The owner watches each tool as it runs, then opens the
 * agent behind each step and decides it there (rule 3).
 */
export function PlanAgent({
  open,
  goal,
  onClose,
  onOpen,
}: {
  open: boolean;
  goal: string;
  onClose: () => void;
  onOpen: (target: PlanTarget) => void;
}) {
  const { lang, text } = useOwnerLanguage();
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={plannerWordsFor(lang).title}
      tone="night"
      footer={
        <div className="pb-3">
          <Button wide variant="night" onClick={onClose}>
            {text.done}
          </Button>
        </div>
      }
    >
      {open && <Planning goal={goal} onOpen={onOpen} />}
    </Sheet>
  );
}

function Planning({ goal, onOpen }: { goal: string; onOpen: (target: PlanTarget) => void }) {
  const { lang, text } = useOwnerLanguage();
  const words = plannerWordsFor(lang);
  const guard = guardrailWordsFor(lang);
  const [rail, setRail] = useState<RailEntry[]>([]);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    streamPlan(goal, (line) => {
      if (!current) return;
      if (line.type === "step") {
        setRail((entries) => [...entries.filter((e) => e.name !== line.name), line]);
      } else if (line.type === "plan") setPlan(line);
      else setFailed(true);
    }).catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [goal]);

  const weekWords = (state: unknown) =>
    state === "short" || state === "close" || state === "ok" ? text.weekState[state] : "";
  const steps: Step[] = [
    ...rail.map((entry, index): Step => ({
      title: words.rail[entry.name] ?? entry.name,
      meta: railMeta(entry, words, weekWords),
      state: plan || index < rail.length - 1 ? "done" : "current",
    })),
    { title: words.ordering, state: plan ? "done" : "todo" },
    {
      title: guard.checked,
      meta: plan
        ? guard.railMeta(
            plan.guardrails.rules.length,
            plan.guardrails.blocked,
            plan.guardrails.fixed,
          )
        : null,
      state: plan ? "done" : "todo",
    },
  ];

  return (
    <div className="pb-2">
      <Steps steps={steps} tone="night" />
      {failed && !plan && <p className="mt-5 text-night-muted">{words.failed}</p>}
      {plan && plan.steps.length === 0 && <p className="mt-5">{words.nothingToDo}</p>}
      {plan && plan.steps.length > 0 && (
        <ol className="mt-5 flex flex-col gap-3">
          {plan.steps.map((step, index) => (
            <li key={step.action} className="rounded-3xl bg-night-raised p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-yellow text-sm font-bold text-yellow-ink">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{words.step[step.action](step.names)}</p>
                  <p className="mt-1 text-sm text-night-muted">{words.reason[step.reason]}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="font-bold tabular-nums">
                      {words.amount[step.action](formatMoney(step.amount_paise))}
                    </span>
                    <SourceBadge label={step.label} />
                  </div>
                  <p className="mt-1 text-sm text-night-muted">
                    {step.gap_after_paise < 0
                      ? words.shortAfter(formatMoney(-step.gap_after_paise))
                      : words.spareAfter(formatMoney(step.gap_after_paise))}
                    {(step.action === "collect" || step.action === "pay_bills") &&
                      ` · ${words.inHandAfter(formatMoney(step.in_hand_after_paise))}`}
                  </p>
                  <Button variant="yellow" className="mt-3" onClick={() => onOpen(step.opens)}>
                    {words.open[step.opens]}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {plan && <PlanGuardrails plan={plan} />}
      {plan && (
        <p className="mt-5 text-sm text-night-muted">
          {plan.planned_by === "model"
            ? words.byModel
            : plan.rules_because === "plan_blocked"
              ? guard.byRulesBlocked
              : words.byRules}{" "}
          {plan.usage.calls > 0 &&
            `${words.usage(plan.usage.calls, plan.usage.input_tokens.toLocaleString("en-IN"))} ${guard.privacy} `}
          <a
            className="underline underline-offset-2"
            href={`/api/agent/runs/${plan.run_id}`}
            target="_blank"
            rel="noreferrer"
          >
            {words.record}
          </a>
        </p>
      )}
    </div>
  );
}

function railMeta(
  entry: RailEntry,
  words: PlannerWords,
  weekWords: (state: unknown) => string,
): string | null {
  const { meta } = entry;
  const number = (key: string) => (typeof meta[key] === "number" ? (meta[key] as number) : 0);
  switch (entry.name) {
    case "summary":
      return weekWords(meta.state);
    case "look_at_week":
      return `${weekWords(meta.state)}: ${formatMoney(Math.abs(number("gap_paise")))}`;
    case "list_late_payers":
      return words.railMeta.late(number("count"));
    case "list_bills_due":
      return words.railMeta.bills(number("count"));
    case "check_stock":
      return words.railMeta.stock(number("low"), number("groups"));
    case "check_loan":
      return words.railMeta.loan(
        number("loan_needed_paise") > 0 ? formatMoney(number("loan_needed_paise")) : null,
      );
    case "check_bill_limit":
      return words.railMeta.limit(meta.set === true, number("pay"), number("hold"));
    default:
      return null;
  }
}
