"use client";

import { LoaderCircle, Mic } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export type MicState = "idle" | "listening" | "thinking";

const englishLabels: Record<MicState, string> = {
  idle: "Hold to talk",
  listening: "Listening, let go to send",
  thinking: "Working on it",
};

/**
 * The customer's hold-to-talk button. It only reports the press; recording lives with the
 * voice page, which must ignore a second release (touch screens can send two). While listening, a ring pulses: the one looping motion in the app, because the
 * customer must see the shop is listening.
 */
export function MicButton({
  state,
  onHoldStart,
  onHoldEnd,
  labels = englishLabels,
}: {
  state: MicState;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  /** What the button says in each state, in the customer's language. */
  labels?: Record<MicState, string>;
}) {
  const busy = state === "thinking";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid size-22 place-items-center">
        {state === "listening" && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-accent/15"
            animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <button
          type="button"
          aria-label={labels[state]}
          aria-pressed={state === "listening"}
          disabled={busy}
          onPointerDown={(event) => {
            // Keeps the press on the button if the finger drifts while speaking, so the
            // release always arrives here.
            event.currentTarget.setPointerCapture(event.pointerId);
            onHoldStart();
          }}
          onPointerUp={onHoldEnd}
          onPointerCancel={onHoldEnd}
          onContextMenu={(event) => event.preventDefault()}
          className={cn(
            "relative grid size-22 touch-none place-items-center rounded-full bg-accent text-accent-ink transition-transform select-none",
            state === "listening" ? "scale-110" : "active:scale-95",
            busy && "opacity-60",
          )}
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-9 animate-spin" />
          ) : (
            <Mic aria-hidden className="size-9" />
          )}
        </button>
      </div>
      <p aria-live="polite" className="text-sm font-medium text-ink-muted">
        {labels[state]}
      </p>
    </div>
  );
}
