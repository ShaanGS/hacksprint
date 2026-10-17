"use client";

import { motion } from "motion/react";

/** Three dots while the shop is working out its answer: a loop, so it shows only while it thinks. */
export function Typing({ label }: { label: string }) {
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="size-2 rounded-full bg-ink-muted"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
