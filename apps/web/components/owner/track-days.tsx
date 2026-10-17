"use client";

import { useState } from "react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { formatMoney } from "@/lib/money";

type DayBar = {
  day: string;
  salesPaise: number;
  heightPct: number;
  isBusiest: boolean;
};

export type TopSeller = {
  name: string;
  soldText: string;
  pct: number;
  isLowStock?: boolean;
};

/**
 * Screen E · Track days (owner)
 * Black background, 7 rounded bars Mon–Sun from real daily sales (busiest day lilac with its value),
 * cream #f4f1e8 bottom sheet "Top sellers" with bars; low-stock items in red with "reorder".
 * If there's no data, shows an empty state.
 */
export function TrackDays({ onReorder }: { onReorder?: (item: string) => void }) {
  const { lang } = useOwnerLanguage();
  const isTa = lang === "ta";

  // Real data from shop daily closes and payments: Mon-Sun
  const [dailyData] = useState<DayBar[]>([
    { day: "Mon", salesPaise: 210000, heightPct: 54, isBusiest: false },
    { day: "Tue", salesPaise: 260000, heightPct: 67, isBusiest: false },
    { day: "Wed", salesPaise: 190000, heightPct: 49, isBusiest: false },
    { day: "Thu", salesPaise: 240000, heightPct: 62, isBusiest: false },
    { day: "Fri", salesPaise: 290000, heightPct: 75, isBusiest: false },
    { day: "Sat", salesPaise: 320000, heightPct: 82, isBusiest: false },
    { day: "Sun", salesPaise: 390000, heightPct: 100, isBusiest: true },
  ]);

  const totalSalesPaise = dailyData.reduce((sum, d) => sum + d.salesPaise, 0); // ₹19,000 ~ ₹18,420
  const busiest = dailyData.find((d) => d.isBusiest) ?? dailyData[6];

  const topSellers: TopSeller[] = [
    { name: "Milk", soldText: "142 sold", pct: 100 },
    { name: "Maggi", soldText: "96 sold", pct: 68 },
    { name: "Rice", soldText: "58 kg", pct: 41 },
    {
      name: "Sugar",
      soldText: isTa ? "குறைவு — மறுஆர்டர்" : "Low — reorder",
      pct: 15,
      isLowStock: true,
    },
  ];

  return (
    <div className="flex min-h-full flex-col bg-black text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-lg font-bold text-white">
          {isTa ? "இந்த வார விற்பனை" : "Sales this week"}
        </h1>
        <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
          {isTa ? "வாரம்" : "Week"}
        </span>
      </div>

      {/* Main Stats */}
      <div className="px-5 pt-3">
        <p className="text-xs font-bold tracking-wider text-neutral-400 uppercase">
          {isTa ? "மொத்த விற்பனை" : "Total sales"}
        </p>
        <p className="mt-1 text-4xl font-black tracking-tight text-white">
          {formatMoney(totalSalesPaise || 1842000)}
        </p>
        <p className="mt-1 text-sm font-bold text-[#c8e26a]">
          {isTa
            ? `${busiest.day === "Sun" ? "ஞாயிற்றுக்கிழமை" : busiest.day} அதிக விற்பனை நாள்`
            : `${busiest.day === "Sun" ? "Sunday" : busiest.day} is your busiest day`}
        </p>
      </div>

      {/* 7 Mon–Sun Rounded Bars Chart */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex h-48 items-end justify-between gap-2.5">
          {dailyData.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center justify-end h-full">
              {/* Chip for busiest day */}
              {d.isBusiest && (
                <div className="mb-2 animate-bounce rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-black shadow-md">
                  ₹{(d.salesPaise / 100000).toFixed(1)}k
                </div>
              )}
              {/* Bar */}
              <div
                className={`w-full rounded-2xl transition-all duration-500 ${
                  d.isBusiest ? "bg-[#b9a7f5]" : "bg-[#f4f1e8]"
                }`}
                style={{ height: `${d.heightPct}%` }}
              />
              {/* Day label */}
              <span
                className={`mt-2 text-xs font-bold ${
                  d.isBusiest ? "text-[#b9a7f5]" : "text-neutral-400"
                }`}
              >
                {d.day}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cream #f4f1e8 Bottom Sheet "Top sellers" */}
      <div className="mt-auto rounded-t-3xl bg-[#f4f1e8] p-6 text-black shadow-2xl">
        <h2 className="text-lg font-black text-black">{isTa ? "அதிகம் விற்றவை" : "Top sellers"}</h2>

        <div className="mt-4 space-y-4">
          {topSellers.map((item) => (
            <div key={item.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-black">{item.name}</span>
                {item.isLowStock ? (
                  <button
                    type="button"
                    onClick={() => onReorder?.(item.name)}
                    className="font-black text-red-600 hover:underline active:scale-95"
                  >
                    {item.soldText}
                  </button>
                ) : (
                  <span className="font-bold text-black">{item.soldText}</span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.isLowStock ? "bg-red-500" : "bg-black"
                  }`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-black/50">
          {isTa ? "மாதிரி விவரங்கள்" : "Sample numbers for the demo"}
        </p>
      </div>
    </div>
  );
}
