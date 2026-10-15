import type { Transition } from "motion/react";

// Motion explains a change: something arrived, moved or finished. Nothing loops except while the
// app listens, thinks or loads, and AppFrame turns all of it off for reduced motion.

/** Quick and firm: checks, taps and small things settling into place. */
export const snappy: Transition = { type: "spring", stiffness: 520, damping: 30 };

/** Calm: cards and panels moving or changing size. */
export const soft: Transition = { type: "spring", stiffness: 300, damping: 30 };

/**
 * New items rise into place. Position only: an entrance that fades in from nothing leaves a
 * blank screen when the browser pauses animation (a background tab, a screenshot).
 */
export const rise = { initial: { y: 12 }, animate: { y: 0 }, transition: soft } as const;
