"use client";

import { LoaderCircle, Mic } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type MicState = "idle" | "listening" | "thinking";

const englishLabels: Record<MicState, string> = {
  idle: "Hold to talk",
  listening: "Listening, let go to send",
  thinking: "Working on it",
};

// Bar heights for the listening wave, in px: a fixed shape that rises and falls, not a meter.
const bars = [10, 18, 26, 18, 10];

/**
 * The customer's hold-to-talk button. It only reports the press; recording lives with the
 * voice page, which must ignore a second release (touch screens can send two). While listening,
 * a ring pulses and a wave moves beside the seconds held: the loops the customer needs to see.
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
  const listening = state === "listening";
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative grid size-24 place-items-center">
        {listening && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-accent/15"
            animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <button
          type="button"
          aria-label={labels[state]}
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
            "relative grid size-24 touch-none place-items-center rounded-full bg-accent text-accent-ink shadow-float transition-transform select-none",
            listening ? "scale-110" : "active:scale-95",
            busy && "opacity-60",
          )}
        >
          {busy ? (
            <LoaderCircle aria-hidden className="size-10 animate-spin" />
          ) : (
            <Mic aria-hidden className="size-10" />
          )}
        </button>
      </div>
      <div aria-live="polite" className="flex h-7 items-center gap-2">
        {listening && (
          <span aria-hidden className="flex items-center gap-1">
            {bars.map((height, index) => (
              <motion.span
                key={index}
                className="w-1 rounded-full bg-ink"
                style={{ height }}
                animate={{ scaleY: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: index * 0.1 }}
              />
            ))}
          </span>
        )}
        <p className="text-sm font-medium text-ink-muted">{labels[state]}</p>
        {listening && <HeldSeconds />}
      </div>
    </div>
  );
}

/**
 * Seconds since the press began, so the customer can see the shop is still listening. Mounted
 * only while listening, so every press starts again from zero.
 */
function HeldSeconds() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="text-sm font-semibold text-ink tabular-nums">
      0:{String(seconds).padStart(2, "0")}
    </span>
  );
}
