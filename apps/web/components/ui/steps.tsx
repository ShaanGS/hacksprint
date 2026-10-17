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

const tones = {
  light: {
    todo: "ring-surface-pressed",
    current: "ring-accent",
    dot: "bg-accent",
    tick: "bg-accent text-accent-ink",
    rail: "bg-surface-pressed",
    fill: "bg-accent",
    title: "",
    todoTitle: "text-ink-faint",
    meta: "text-ink-muted",
  },
  night: {
    todo: "ring-night-raised",
    current: "ring-yellow",
    dot: "bg-yellow",
    tick: "bg-yellow text-yellow-ink",
    rail: "bg-night-raised",
    fill: "bg-indigo",
    title: "text-night-ink",
    todoTitle: "text-night-muted",
    meta: "text-night-muted",
  },
} as const;

/**
 * Where something is, step by step. A step ticks with a spring and the rail fills down to the
 * next one; steps that were already done when the screen opened just show as done. The agents
 * use the night tone: an indigo rail with yellow ticks.
 */
export function Steps({ steps, tone = "light" }: { steps: Step[]; tone?: keyof typeof tones }) {
  const look = tones[tone];
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
                  step.state === "todo" && cn("ring-2 ring-inset", look.todo),
                  step.state === "current" && cn("ring-2 ring-inset", look.current),
                )}
              >
                <motion.span
                  initial={false}
                  animate={{ scale: done ? 1 : 0.4, opacity: done ? 1 : 0 }}
                  transition={snappy}
                  className={cn("absolute inset-0 grid place-items-center rounded-full", look.tick)}
                >
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                </motion.span>
                {step.state === "current" && (
                  <span className={cn("size-2.5 rounded-full", look.dot)} />
                )}
              </span>
              {!last && (
                <span aria-hidden className={cn("relative w-0.5 flex-1", look.rail)}>
                  <motion.span
                    initial={false}
                    animate={{ scaleY: done ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    className={cn("absolute inset-0 origin-top", look.fill)}
                  />
                </span>
              )}
            </div>
            <div className={cn("flex min-w-0 flex-1 items-start gap-3", last ? "pb-1" : "pb-6")}>
              <div className="min-w-0 flex-1 pt-1">
                <p
                  className={cn(
                    "text-lg leading-6 font-semibold",
                    look.title,
                    step.state === "todo" && cn("font-medium", look.todoTitle),
                  )}
                >
                  {step.title}
                </p>
                {step.meta && <p className={cn("mt-0.5 text-base", look.meta)}>{step.meta}</p>}
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
