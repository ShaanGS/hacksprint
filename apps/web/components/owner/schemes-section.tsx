"use client";

import { Check, ExternalLink, Landmark } from "lucide-react";
import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { DaySummary } from "@/lib/owner/types";

// Information only. Munim does not apply for, give or advise on loans: it points the owner to
// official government portals and hands them their own numbers to show a bank.
const schemes = [
  {
    name: "Udyam Registration",
    tamil: "உத்யம் பதிவு",
    text: "Free government registration for small businesses. Often the first step for scheme benefits.",
    tamilText: "சிறு வணிகங்களுக்கான இலவச அரசுப் பதிவு. திட்டப் பயன்களைப் பெறுவதற்கான முதல் படி.",
    href: "https://udyamregistration.gov.in",
  },
  {
    name: "PM MUDRA Yojana",
    tamil: "முத்ரா கடன்",
    text: "Small business loans through banks, without collateral, for shops and traders.",
    tamilText: "கடைகள் மற்றும் வணிகர்களுக்கு பிணையில்லா வங்கிக் கடன்கள்.",
    href: "https://www.mudra.org.in",
  },
  {
    name: "PM SVANidhi",
    tamil: "ஸ்வநிதி",
    text: "Small working-capital loans for street and small vendors.",
    tamilText: "தெருவோர மற்றும் சிறு வணிகர்களுக்கான நடைமுறை மூலதனக் கடன்.",
    href: "https://pmsvanidhi.mohua.gov.in",
  },
  {
    name: "CGTMSE",
    tamil: "கடன் உத்தரவாதம்",
    text: "Government guarantee that helps banks lend to small businesses without collateral.",
    tamilText: "சிறு வணிகர்களுக்கு பிணையின்றி கடன் வழங்க வங்கிகளுக்கு உதவும் அரசு உத்தரவாதம்.",
    href: "https://www.cgtmse.in",
  },
];

/** Government scheme pointers and a summary of the shop's own numbers for a bank visit. */
export function SchemesSection({ shopName, summary }: { shopName: string; summary: DaySummary }) {
  const { lang } = useOwnerLanguage();
  const isTa = lang === "ta";
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const lines = isTa
    ? [
        `${shopName} — வணிகக் கணக்கு விவரம்`,
        `இன்றைய ஆர்டர்கள்: ${summary.orders}`,
        `இன்று வசூலித்தது: ${formatMoney(summary.collectedPaise)}`,
        `இன்று கணக்கில் கொடுத்தது: ${formatMoney(summary.creditPaise)}`,
        `வாடிக்கையாளர்கள் தர வேண்டிய மொத்த பாக்கி: ${formatMoney(summary.owedPaise)}`,
        `முனிம் மூலம் பதிவு செய்யப்பட்டது.`,
      ]
    : [
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
        <Landmark aria-hidden className="size-6 text-ink" />
        <h2 className="text-xl leading-tight font-extrabold tracking-tight">
          {isTa ? "அரசு திட்டங்கள்" : "Government schemes"}
        </h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {isTa
          ? "சிறு கடைகளுக்கான உதவி. அதிகாரப்பூர்வ தளத்தில் தகுதியை சரிபார்க்கவும் — முனிம் வழிகாட்ட மட்டுமே செய்கிறது."
          : "Help for small shops. Check eligibility on the official site — Munim only shows you where to look."}
      </p>

      <ul className="mt-4 space-y-3">
        {schemes.map((scheme) => (
          <li key={scheme.name}>
            <a
              href={scheme.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-2xl bg-surface p-3 transition-transform active:scale-98"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold">
                  {scheme.name} <span className="font-medium text-ink-muted">· {scheme.tamil}</span>
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {isTa ? scheme.tamilText : scheme.text}
                </p>
              </div>
              <ExternalLink aria-hidden className="mt-1 size-5 shrink-0 text-ink-faint" />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-surface p-3">
        <p className="text-base font-bold">
          {isTa ? "வங்கிக்கு செல்கிறீர்களா?" : "Going to the bank?"}
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">
          {isTa
            ? "நோட்டுப் புத்தகத்திற்கு பதிலாக உங்கள் கடையின் கணக்கைக் காட்டுங்கள்."
            : "Show your shop's numbers instead of a notebook."}
        </p>
        {open && (
          <pre className="mt-3 rounded-xl bg-surface-muted p-3 text-sm whitespace-pre-wrap font-sans">
            {lines.join("\n")}
          </pre>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={() => setOpen((v) => !v)}>
            {open ? (isTa ? "மறைக்க" : "Hide") : isTa ? "கணக்கை பார்க்க" : "View summary"}
          </Button>
          <Button onClick={copy}>
            {copied ? (
              <>
                <Check aria-hidden className="size-5" strokeWidth={3} />{" "}
                {isTa ? "நகலெடுக்கப்பட்டது" : "Copied"}
              </>
            ) : isTa ? (
              "கணக்கை நகலெடு"
            ) : (
              "Copy summary"
            )}
          </Button>
        </div>
      </div>
    </section>
  );
}
