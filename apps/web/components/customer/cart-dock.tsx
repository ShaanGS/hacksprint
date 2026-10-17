"use client";

import { ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { toArtName } from "@/components/ui/art";
import { ArtStack } from "@/components/ui/art-stack";
import { Ticker } from "@/components/ui/ticker";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import { snappy } from "@/lib/motion";
import type { Cart } from "@/lib/orders/cart";

/** The cart, floating above the mic: what is in it at a glance, and the total counting up. */
export function CartDock({ cart, lang, onOpen }: { cart: Cart; lang: Lang; onOpen: () => void }) {
  const t = textFor(lang);
  const count = cart.lines.length;
  return (
    // Keyed on the count, so each new line gives the dock a small bump the eye catches.
    <motion.button
      key={count}
      type="button"
      onClick={onOpen}
      initial={{ scale: 0.96 }}
      animate={{ scale: 1 }}
      transition={snappy}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3 pr-4 shadow-float ring-1 ring-border"
    >
      <ArtStack names={cart.lines.map((line) => toArtName(line.art))} size={36} />
      <span lang={lang} className="flex-1 text-left text-base font-semibold">
        {t.items(count)}
      </span>
      <Ticker paise={cart.totalPaise} className="text-lg font-bold" />
      <ChevronUp aria-hidden className="size-5" />
    </motion.button>
  );
}
