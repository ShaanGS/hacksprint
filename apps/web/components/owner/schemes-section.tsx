"use client";

import { Check, ExternalLink, Landmark } from "lucide-react";
import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

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

/** Government scheme pointers and a summary of the shop's numbers for a bank visit. */
export function SchemesSection({
  shopName,
  summary,
}: {
  shopName?: string;
  summary?: {
    orders?: number;
    collectedPaise?: number;
    creditPaise?: number;
    owedPaise?: number;
  };
}) {
  const { lang } = useOwnerLanguage();
  const isTa = lang === "ta";
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const name = shopName || "Lakshmi Stores";
  const ordersCount = summary?.orders ?? 8;
  const collectedPaise = summary?.collectedPaise ?? 1842000;
  const creditPaise = summary?.creditPaise ?? 365000;
  const owedPaise = summary?.owedPaise ?? 720000;

  const lines = isTa
    ? [
        `${name} — வணிகக் கணக்கு விவரம்`,
        `இன்றைய ஆர்டர்கள்: ${ordersCount}`,
        `இன்று வசூலித்தது: ${formatMoney(collectedPaise)}`,
        `இன்று கணக்கில் கொடுத்தது: ${formatMoney(creditPaise)}`,
        `வாடிக்கையாளர்கள் தர வேண்டிய மொத்த பாக்கி: ${formatMoney(owedPaise)}`,
        `முனிம் மூலம் பதிவு செய்யப்பட்டது.`,
      ]
    : [
        `${name} — business summary`,
        `Orders today: ${ordersCount}`,
        `Collected today: ${formatMoney(collectedPaise)}`,
        `Given on account today: ${formatMoney(creditPaise)}`,
        `Owed by customers in total: ${formatMoney(owedPaise)}`,
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
    <section className="mt-6 rounded-3xl bg-[#1f1f1f] border border-white/10 p-5 text-white">
      <div className="flex items-center gap-2">
        <Landmark aria-hidden className="size-6 text-[#c8e26a]" />
        <h2 className="text-xl leading-tight font-extrabold tracking-tight text-white">
          {isTa ? "அரசு திட்டங்கள்" : "Government schemes"}
        </h2>
      </div>
      <p className="mt-1 text-sm text-neutral-400">
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
              className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/5 p-3.5 transition hover:bg-white/10 active:scale-[0.98]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white">
                  {scheme.name}{" "}
                  <span className="font-medium text-neutral-400">· {scheme.tamil}</span>
                </p>
                <p className="mt-0.5 text-sm text-neutral-400">
                  {isTa ? scheme.tamilText : scheme.text}
                </p>
              </div>
              <ExternalLink aria-hidden className="mt-1 size-5 shrink-0 text-neutral-400" />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-4 rounded-2xl bg-white/5 border border-white/5 p-4">
        <p className="text-base font-bold text-white">
          {isTa ? "வங்கிக்கு செல்கிறீர்களா?" : "Going to the bank?"}
        </p>
        <p className="mt-0.5 text-sm text-neutral-400">
          {isTa
            ? "நோட்டுப் புத்தகத்திற்கு பதிலாக உங்கள் கடையின் கணக்கைக் காட்டுங்கள்."
            : "Show your shop's numbers instead of a notebook."}
        </p>
        {open && (
          <pre className="mt-3 rounded-xl bg-black/50 p-3 text-sm text-neutral-300 whitespace-pre-wrap font-sans">
            {lines.join("\n")}
          </pre>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="soft"
            onClick={() => setOpen((v) => !v)}
            className="bg-white/10 text-white hover:bg-white/15"
          >
            {open ? (isTa ? "மறைக்க" : "Hide") : isTa ? "கணக்கை பார்க்க" : "View summary"}
          </Button>
          <Button onClick={copy} className="bg-[#c8e26a] text-black hover:bg-[#b8d25a]">
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
