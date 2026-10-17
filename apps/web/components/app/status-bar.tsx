"use client";

import { useSyncExternalStore } from "react";
import { phoneClock } from "@/lib/time";

// Reads the clock again every few seconds, so the minute turns over on time.
function subscribe(onTick: () => void) {
  const timer = window.setInterval(onTick, 5000);
  return () => window.clearInterval(timer);
}

/**
 * The top line of the drawn iPhone on a laptop: the time in India on the left of the island,
 * signal, Wi-Fi and battery on the right. Only the frame shows it (app/frame.css); a real phone
 * draws its own. The server renders no time, so the page never shows a stale one.
 */
export function StatusBar() {
  const time = useSyncExternalStore(
    subscribe,
    () => phoneClock(new Date()),
    () => "",
  );
  return (
    <div aria-hidden className="status-bar">
      <span>{time}</span>
      <span />
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" width="18" height="12" fill="currentColor">
          <rect x="0" y="7.5" width="3" height="4.5" rx="1" />
          <rect x="5" y="5" width="3" height="7" rx="1" />
          <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" width="16" height="12" fill="currentColor">
          <path d="M.22 3.22a11 11 0 0 1 15.56 0L13.8 5.2a8.2 8.2 0 0 0-11.6 0Z" />
          <path d="M3.33 6.33a6.6 6.6 0 0 1 9.34 0l-1.91 1.91a3.9 3.9 0 0 0-5.52 0Z" />
          <path d="M8 11 6.16 9.16a2.6 2.6 0 0 1 3.68 0Z" />
        </svg>
        <svg viewBox="0 0 27 13" width="27" height="13" fill="currentColor">
          <rect
            x=".5"
            y=".5"
            width="23"
            height="12"
            rx="3.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".4"
          />
          <rect x="2" y="2" width="20" height="9" rx="2" />
          <path d="M25 4.5v4a1.5 2 0 0 0 0-4Z" fillOpacity=".4" />
        </svg>
      </span>
    </div>
  );
}
