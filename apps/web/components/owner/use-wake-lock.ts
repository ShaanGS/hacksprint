import { useEffect } from "react";

/**
 * Keeps the owner's screen on while the shop is open, so a new order is seen and heard. The
 * browser drops the lock whenever the page is hidden; it is taken again when the page is back.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;
    async function take() {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      // Refused on low battery or by the browser: the app still works, the screen may sleep.
      lock = await navigator.wakeLock.request("screen").catch(() => null);
      if (stopped) await lock?.release();
    }
    take();
    document.addEventListener("visibilitychange", take);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", take);
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}
