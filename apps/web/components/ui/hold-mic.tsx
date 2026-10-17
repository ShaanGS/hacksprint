"use client";

import { LoaderCircle, Mic } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

export type MicState = "idle" | "listening" | "thinking";

const sizes = {
  lg: { box: "size-24", icon: "size-10" },
  md: { box: "size-16", icon: "size-7" },
};

// The mic is lime everywhere: it is how the owner talks to the app. Soft sits beside a screen's
// primary button without competing with it, and turns lime while it listens.
const variants = {
  primary: "bg-lime text-lime-ink shadow-float",
  soft: "bg-surface-muted text-ink",
};

/**
 * A round hold-to-talk button. It only reports the press; recording lives with the screen, which
 * must ignore a second release (touch screens can send two). While listening, a ring pulses.
 */
export function HoldMic({
  state,
  label,
  size = "lg",
  variant = "primary",
  onHoldStart,
  onHoldEnd,
}: {
  state: MicState;
  /** What the button does now, for screen readers. */
  label: string;
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  const busy = state === "thinking";
  const listening = state === "listening";
  return (
    <div className={cn("relative grid shrink-0 place-items-center", sizes[size].box)}>
      {listening && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-lime/40"
          animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <button
        type="button"
        aria-label={label}
        aria-pressed={listening}
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
          "relative grid touch-none place-items-center rounded-full transition-transform select-none",
          sizes[size].box,
          listening ? variants.primary : variants[variant],
          listening ? "scale-110" : "active:scale-95",
          busy && "opacity-60",
        )}
      >
        {busy ? (
          <LoaderCircle aria-hidden className={cn("animate-spin", sizes[size].icon)} />
        ) : (
          <Mic aria-hidden className={sizes[size].icon} />
        )}
      </button>
    </div>
  );
}
