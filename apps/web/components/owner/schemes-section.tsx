"use client";

import { Check, ExternalLink, Landmark } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { DaySummary } from "@/lib/owner/types";

// Information only. Munim does not apply for, give or advise on loans: it points the owner to
// official government portals and hands them their own numbers to show a bank.
const schemes: { name: string; tamil: string; text: string; href: string }[] = [
  {
    name: "Udyam Registration",
    tamil: "உத்யம் பதிவு",
    text: "Free government registration for small businesses. Often the first step for scheme benefits.",
    href: "https://udyamregistration.gov.in",
  },
  {
    name: "PM MUDRA Yojana",
    tamil: "முத்ரா கடன்",
    text: "Small business loans through banks, without collateral, for shops and traders.",
    href: "https://www.mudra.org.in",
  },
  {
    name: "PM SVANidhi",
    tamil: "ஸ்வநிதி",
    text: "Small working-capital loans for street and small vendors.",
    href: "https://pmsvanidhi.mohua.gov.in",
  },
  {
    name: "CGTMSE",
    tamil: "கடன் உத்தரவாதம்",
    text: "Government guarantee that helps banks lend to small businesses without collateral.",
    href: "https://www.cgtmse.in",
  },
];

/** Government scheme pointers and a summary of the shop's own numbers for a bank visit. */
export function SchemesSection({ shopName, summary }: { shopName: string; summary: DaySummary }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const lines = [
    `${shopName} — business summary`,
    `Orders today: ${summary.orders}`,
    `Collected today: ${formatMoney(summary.collectedPaise)}`,
    `Given on account today: ${formatMoney(summary.creditPaise)}`,
    `Owed by customers in total: ${formatMoney(summary.owedPaise)}`,
    `Records kept with Munim.`,
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setOpen(true);
    }
  }

  return (
    <section className="mt-6 rounded-3xl bg-surface-muted p-4">
      <div className="flex items-center gap-2">
        <Landmark aria-hidden className="size-6" />
        <h2 className="text-xl leading-tight font-extrabold tracking-tight">
          Government schemes
        </h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Help for small shops. Check eligibility on the official site — Munim only shows you where
        to look.
      </p>

      <ul className="mt-4 space-y-3">
        {schemes.map((scheme) => (
          <li key={scheme.name}>
            <a
              href={scheme.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-2xl bg-surface p-3 active:scale-98"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold">
                  {scheme.name} <span className="font-medium text-ink-muted">· {scheme.tamil}</span>
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{scheme.text}</p>
              </div>
              <ExternalLink aria-hidden className="mt-1 size-5 shrink-0 text-ink-faint" />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-surface p-3">
        <p className="text-base font-bold">Going to the bank?</p>
        <p className="mt-0.5 text-sm text-ink-muted">
          Show your shop&apos;s numbers instead of a notebook.
        </p>
        {open && (
          <pre className="mt-3 rounded-xl bg-surface-muted p-3 text-sm whitespace-pre-wrap">
            {lines.join("\n")}
          </pre>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "View summary"}
          </Button>
          <Button onClick={copy}>
            {copied ? (
              <>
                <Check aria-hidden className="size-5" strokeWidth={3} /> Copied
              </>
            ) : (
              "Copy summary"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
