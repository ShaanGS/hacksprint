"use client";

import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { formatMoney } from "@/lib/money";

/**
 * Screen D · Savings & EMI (owner)
 * Lilac #b9a7f5 panel on black background.
 * Shows EMI kept-aside progress, buttons "+ Keep ₹X", "Collect dues", "Schemes".
 * "This week" kept-aside log. Never moves money.
 * Footer: "Munim never moves your money. You decide what to keep aside."
 */
export function RepaymentPlanner({
  onCollect,
  onSchemes,
}: {
  onCollect?: () => void;
  onSchemes?: () => void;
}) {
  const { lang } = useOwnerLanguage();
  const isTa = lang === "ta";

  const [emiPaise] = useState(300000); // ₹3,000
  const [keptPaise, setKeptPaise] = useState(135000); // ₹1,350
  const [keepStep] = useState(22500); // ₹225

  const pct = Math.min(100, Math.round((keptPaise / emiPaise) * 100));

  const handleKeepMore = () => {
    setKeptPaise((current) => Math.min(emiPaise, current + keepStep));
  };

  return (
    <div className="w-full">
      {/* Lilac #b9a7f5 Panel */}
      <section className="relative overflow-hidden rounded-3xl bg-[#b9a7f5] p-6 text-black shadow-lg">
        <p className="text-xs font-extrabold tracking-wider text-black/70 uppercase">
          {isTa ? "தவணைக்காக ஒதுக்கியது" : "Kept aside for EMI"}
        </p>

        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-black tracking-tight text-black">
            {formatMoney(keptPaise)}
          </span>
          <span className="text-2xl font-bold text-black/60"> / {formatMoney(emiPaise)}</span>
        </div>

        <p className="mt-1 text-sm font-semibold text-black/75">
          {isTa ? "தவணை தேதி 6 நவம்பர் · 20 நாட்கள் உள்ளன" : "EMI due 6 Nov · 20 days left"}
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-black/15">
          <div
            className="h-full rounded-full bg-black transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleKeepMore}
            className="flex-1 rounded-full bg-white px-3.5 py-2.5 text-center text-xs font-black text-black shadow-xs transition hover:bg-neutral-100 active:scale-95"
          >
            + Keep {formatMoney(keepStep)}
          </button>

          <button
            type="button"
            onClick={onCollect}
            className="flex-1 rounded-full bg-white px-3.5 py-2.5 text-center text-xs font-black text-black shadow-xs transition hover:bg-neutral-100 active:scale-95"
          >
            {isTa ? "கடன் வசூல்" : "Collect dues"}
          </button>

          <button
            type="button"
            onClick={onSchemes}
            className="flex-1 rounded-full bg-black px-3.5 py-2.5 text-center text-xs font-black text-white shadow-xs transition hover:bg-neutral-800 active:scale-95"
          >
            {isTa ? "திட்டங்கள்" : "Schemes"}
          </button>
        </div>
      </section>

      {/* "This week" log */}
      <section className="mt-6">
        <h3 className="text-base font-extrabold text-white">{isTa ? "இந்த வாரம்" : "This week"}</h3>

        <div className="mt-3 space-y-2 rounded-2xl bg-[#1c1c1e] p-4 text-white border border-white/5">
          {/* Sunday */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
                Su
              </span>
              <span className="text-sm font-medium text-neutral-200">
                {isTa ? "நல்ல வியாபாரம் · ஒதுக்கியது" : "Busy day · kept aside"}
              </span>
            </div>
            <span className="text-sm font-bold text-[#c8e26a]">+₹300</span>
          </div>

          {/* Monday */}
          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
                Mo
              </span>
              <span className="text-sm font-medium text-neutral-200">
                {isTa ? "குறைவான வியாபாரம் · ஒதுக்கியது" : "Slow day · kept aside"}
              </span>
            </div>
            <span className="text-sm font-bold text-[#c8e26a]">+₹100</span>
          </div>

          {/* Lakshmi credit repayment */}
          <div className="flex items-center justify-between py-1 border-t border-white/5">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-bold text-white">
                ₹
              </span>
              <span className="text-sm font-medium text-neutral-200">
                {isTa ? "லட்சுமி பாக்கி செலுத்தினார்" : "Lakshmi paid credit"}
              </span>
            </div>
            <span className="text-sm font-bold text-[#c8e26a]">+₹500</span>
          </div>
        </div>

        {/* Disclaimer footer */}
        <p className="mt-4 text-xs leading-relaxed text-neutral-400">
          {isTa
            ? "முனிம் உங்கள் பணத்தை ஒருபோதும் எடுப்பதில்லை. எவ்வளவு ஒதுக்கி வைக்க வேண்டும் என்பதை நீங்களே முடிவு செய்கிறீர்கள்."
            : "Munim never moves your money. You decide what to keep aside."}
        </p>
      </section>
    </div>
  );
}
