// One audio element for everything a page says. Phones only let a page play sound after a tap,
// and iPhones remember that per element: so the first tap plays a moment of silence on this
// element, and every sound after it plays on the same one.

// 50 ms of silence, small enough to inline.
const SILENCE =
  "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

export type Player = {
  /** Call inside a tap, before any await. Resolves with whether sound is on. */
  unlock(): Promise<boolean>;
  /** Whether a tap has unlocked sound yet. */
  readonly unlocked: boolean;
  /** Plays a sound in place of whatever is playing; resolves when it ends or cannot play. */
  play(url: string): Promise<void>;
  stop(): void;
};

export function createPlayer(): Player {
  const audio = new Audio();
  audio.preload = "auto";
  let unlocked = false;
  // The sound now playing and the promise waiting for it. Events name their source, so an
  // "ended" from a sound that was already replaced cannot finish the new one.
  let pending: { src: string; resolve: () => void } | null = null;

  function settle(src?: string) {
    if (!pending || (src !== undefined && src !== pending.src)) return;
    const { resolve } = pending;
    pending = null;
    resolve();
  }
  audio.addEventListener("ended", () => settle(audio.src));
  audio.addEventListener("error", () => settle(audio.src));

  return {
    unlock() {
      if (unlocked) return Promise.resolve(true);
      audio.src = SILENCE;
      // A refused play only means sound stays off; everything said is also on screen.
      return audio.play().then(
        () => (unlocked = true),
        () => false,
      );
    },
    get unlocked() {
      return unlocked;
    },
    play(url) {
      settle();
      audio.pause();
      audio.src = url;
      const src = audio.src;
      return new Promise((resolve) => {
        pending = { src, resolve };
        audio.play().catch(() => settle(src));
      });
    },
    stop() {
      audio.pause();
      settle();
    },
  };
}
