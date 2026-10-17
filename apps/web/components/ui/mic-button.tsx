"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { HoldMic, type MicState } from "@/components/ui/hold-mic";

const englishLabels: Record<MicState, string> = {
  idle: "Hold to talk",
  listening: "Listening, let go to send",
  thinking: "Working on it",
};

// Bar heights for the listening wave, in px: a fixed shape that rises and falls, not a meter.
const bars = [10, 18, 26, 18, 10];

/**
 * The customer's hold-to-talk button, with what it is doing underneath: while listening, a wave
 * moves beside the seconds held, the loops the customer needs to see.
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
  const listening = state === "listening";
  return (
    <div className="flex flex-col items-center gap-3">
      <HoldMic
        state={state}
        label={labels[state]}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
      />
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
