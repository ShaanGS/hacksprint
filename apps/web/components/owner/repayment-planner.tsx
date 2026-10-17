"use client";

import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { DaySummary } from "@/lib/owner/types";

// The owner earns daily but the bank wants one fixed EMI date. This turns the EMI into a small
// daily set-aside, sized to what the shop actually collects. It never moves money: the owner
// types in his own EMI and decides what to keep aside. Information only, not financial advice.
const RUSH_DAYS = ["Saturday", "Sunday"];

export function RepaymentPlanner({ summary }: { summary: DaySummary }) {
  const [emi, setEmi] = useState("3000");
  const [due, setDue] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString().slice(0, 10);
  });
  const [kept, setKept] = useState(0);
  const [now] = useState(() => Date.now());

  const emiPaise = Math.max(0, Math.round(Number(emi) * 100) || 0);
  const daysLeft = Math.max(1, Math.ceil((new Date(due).getTime() - now) / (24 * 60 * 60 * 1000)));
  const leftPaise = Math.max(0, emiPaise - kept);
  const perDay = Math.ceil(leftPaise / daysLeft / 100) * 100;
  // On a busy day keep a bit more, on a slow day a bit less, so the total still lands on time.
  const today = new Date(now).toLocaleDateString("en-IN", { weekday: "long" });
  const busy = RUSH_DAYS.includes(today) || summary.collectedPaise >= perDay * 4;
  const suggest = busy
    ? Math.round((perDay * 1.5) / 100) * 100
    : Math.round((perDay * 0.75) / 100) * 100;
  const pct = emiPaise ? Math.min(100, Math.round((kept / emiPaise) * 100)) : 0;
  const owed = summary.owedPaise;

  return (
    <section className="mt-6 rounded-3xl bg-surface-muted p-4">
      <div className="flex items-center gap-2">
        <CalendarClock aria-hidden className="size-6" />
        <h2 className="text-xl leading-tight font-extrabold tracking-tight">Loan repayment</h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Fixed EMI date, daily income. Keep a little aside each day so the EMI is ready.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="rounded-2xl bg-surface p-3 text-sm font-medium text-ink-muted">
          EMI amount (₹)
          <input
            inputMode="numeric"
            value={emi}
            onChange={(e) => setEmi(e.target.value.replace(/\D/g, ""))}
            className="mt-1 block w-full bg-transparent text-xl font-extrabold text-ink outline-none"
          />
        </label>
        <label className="rounded-2xl bg-surface p-3 text-sm font-medium text-ink-muted">
          Due date
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="mt-1 block w-full bg-transparent text-base font-bold text-ink outline-none"
          />
        </label>
      </div>

      <div className="mt-3 rounded-2xl bg-surface p-3">
        <div className="flex justify-between text-base font-bold">
          <span>Kept aside {formatMoney(kept)}</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-success transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-base">
          {leftPaise === 0 ? (
            <span className="font-bold text-success">EMI is ready. Pay it on {due}.</span>
          ) : (
            <>
              {daysLeft} days left · about <b>{formatMoney(perDay)}</b> a day.
              <br />
              {busy ? "Good day today — " : "Slow day — "}
              keep aside <b>{formatMoney(suggest)}</b>.
            </>
          )}
        </p>
        {leftPaise > 0 && (
          <Button
            wide
            className="mt-3"
            onClick={() => setKept((k) => Math.min(emiPaise, k + suggest))}
          >
            I kept {formatMoney(suggest)} aside
          </Button>
        )}
        {leftPaise > 0 && owed >= leftPaise / 2 && (
          <p className="mt-3 text-sm text-ink-muted">
            Customers owe you {formatMoney(owed)}. Collecting some of it would cover much of the EMI
            — see the Credit tab.
          </p>
        )}
      </div>
    </section>
  );
}
