"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Every page renders inside this frame: full screen on a phone, a 390 x 844 phone on a laptop
 * or projector (see .frame and .screen in globals.css). Sheets attach to #screen so they stay
 * inside the phone.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="frame">
        <div id="screen" className="screen">
          <div className="scroll">{children}</div>
        </div>
      </div>
    </MotionConfig>
  );
}
