"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { StatusBar } from "@/components/app/status-bar";

const sideButtons = ["action", "volume-up", "volume-down", "power"] as const;

/**
 * Every page renders inside this frame: full screen on a phone; on a laptop or projector, inside
 * a drawn iPhone at real proportions, scaled down whole when the window is short (see
 * app/frame.css). Sheets attach to #screen so they stay inside the phone.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="frame">
        <div className="device">
          {sideButtons.map((button) => (
            <span key={button} aria-hidden className="side-button" data-button={button} />
          ))}
          <div id="screen" className="screen">
            <StatusBar />
            <span aria-hidden className="island" />
            <div className="scroll">{children}</div>
            <span aria-hidden className="home-bar" />
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
