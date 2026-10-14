"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";

/** A total that counts to its new value when it changes, so the eye catches the update. */
export function Ticker({ paise, className }: { paise: number; className?: string }) {
  const value = useMotionValue(paise);
  const text = useTransform(value, (n) => formatMoney(Math.round(n)));

  useEffect(() => {
    const controls = animate(value, paise, { duration: 0.8, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, paise]);

  return <motion.span className={cn("tabular-nums", className)}>{text}</motion.span>;
}
