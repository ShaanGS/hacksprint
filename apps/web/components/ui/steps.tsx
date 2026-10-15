"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Art, type ArtName } from "@/components/ui/art";
import { cn } from "@/lib/cn";
import { snappy } from "@/lib/motion";

export type Step = {
  title: string;
  meta?: string | null;
  state: "done" | "current" | "todo";
  art?: ArtName;
};

/**
 * Where something is, step by step. A step ticks with a spring and the rail fills down to the
 * next one; steps that were already done when the screen opened just show as done.
 */
export function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol>
      {steps.map((step, index) => {
        const done = step.state === "done";
        const last = index === steps.length - 1;
        return (
          <li key={step.title} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "relative grid size-8 shrink-0 place-items-center rounded-full",
                  step.state === "todo" && "ring-2 ring-surface-pressed ring-inset",
                  step.state === "current" && "ring-2 ring-ink ring-inset",
                )}
              >
                <motion.span
                  initial={false}
                  animate={{ scale: done ? 1 : 0.4, opacity: done ? 1 : 0 }}
                  transition={snappy}
                  className="absolute inset-0 grid place-items-center rounded-full bg-accent text-accent-ink"
                >
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                </motion.span>
                {step.state === "current" && <span className="size-2.5 rounded-full bg-ink" />}
              </span>
              {!last && (
                <span aria-hidden className="relative w-0.5 flex-1 bg-surface-pressed">
                  <motion.span
                    initial={false}
                    animate={{ scaleY: done ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 origin-top bg-ink"
                  />
                </span>
              )}
            </div>
            <div className={cn("flex min-w-0 flex-1 items-start gap-3", last ? "pb-1" : "pb-6")}>
              <div className="min-w-0 flex-1 pt-1">
                <p
                  className={cn(
                    "text-lg leading-6 font-semibold",
                    step.state === "todo" && "font-medium text-ink-faint",
                  )}
                >
                  {step.title}
                </p>
                {step.meta && <p className="mt-0.5 text-base text-ink-muted">{step.meta}</p>}
              </div>
              {step.art && (
                <Art
                  name={step.art}
                  size={40}
                  className={cn(step.state === "todo" && "opacity-40")}
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
