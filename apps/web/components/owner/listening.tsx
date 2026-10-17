"use client";

import { Mic } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOwnerLanguage } from "@/components/owner/owner-language";
import { Orb } from "@/components/ui/orb";
import { agentWordsFor } from "@/lib/i18n/agents";
import { snappy } from "@/lib/motion";

export type ListeningState = "listening" | "working";

/**
 * While the owner holds the mic, and while his words are read: the night layer with the orb
 * (reference 2). It takes no taps, so the held mic underneath still gets the release.
 */
export function Listening({ state }: { state: ListeningState | null }) {
  const { lang } = useOwnerLanguage();
  const words = agentWordsFor(lang);
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key="listening"
          initial={{ y: 24, opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={snappy}
          aria-live="polite"
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center bg-night px-6 pt-14 text-center text-night-ink"
        >
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-indigo px-5 text-sm font-semibold">
            <Mic aria-hidden className="size-4" />
            {words.voiceTitle}
          </span>
          <p className="mt-6 text-base text-night-muted">
            {state === "listening" ? words.listening : words.working}
          </p>
          <div className="mt-2">
            <Orb size={240} />
          </div>
          <p className="mt-4 text-sm text-night-muted">{words.trySaying}</p>
          <p className="mt-1 text-2xl leading-snug font-semibold">{words.example}</p>
          <div className="mt-auto flex flex-col items-center gap-3 pb-12">
            <span className="grid size-20 place-items-center rounded-full bg-lime text-lime-ink shadow-float">
              <Mic aria-hidden className="size-9" />
            </span>
            <span className="min-h-5 text-sm text-night-muted">
              {state === "listening" ? words.letGo : ""}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
