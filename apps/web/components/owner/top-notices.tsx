"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { snappy } from "@/lib/motion";

/** Messages floating at the top of the owner's screen, over whatever tab is open. */
export function TopNotices({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex flex-col items-center gap-2 px-4 pt-3">
      {children}
    </div>
  );
}

/** One message; with onClick it is a button. */
export function Pill({
  icon,
  onClick,
  children,
}: {
  icon?: ReactNode;
  onClick?: () => void;
  children: ReactNode;
}) {
  const style =
    "pointer-events-auto flex min-h-11 max-w-full items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-surface shadow-float";
  return (
    <motion.div
      layout
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -12, opacity: 0 }}
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
