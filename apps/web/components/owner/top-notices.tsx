"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

/**
 * Messages rising just above the tab bar, over whatever tab is open, so they never cover a
 * page's title.
 */
export function TopNotices({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-32 z-40 flex flex-col-reverse items-center gap-2 px-4">
      {children}
    </div>
  );
}

const tones = {
  ink: "bg-ink text-surface",
  yellow: "bg-yellow text-yellow-ink",
} as const;

/** One message; with onClick it is a button. Lime asks the owner to do something. */
export function Pill({
  icon,
  tone = "ink",
  onClick,
  children,
}: {
  icon?: ReactNode;
  tone?: keyof typeof tones;
  onClick?: () => void;
  children: ReactNode;
}) {
  const style = cn(
    "pointer-events-auto flex min-h-11 max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-float",
    tones[tone],
  );
  return (
    <motion.div
      layout
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 12, opacity: 0 }}
      transition={snappy}
      role={onClick ? undefined : "status"}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className={style}>
          {icon}
          {children}
        </button>
      ) : (
        <p className={style}>
          {icon}
          {children}
        </p>
      )}
    </motion.div>
  );
}
