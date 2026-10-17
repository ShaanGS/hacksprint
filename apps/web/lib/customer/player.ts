// One audio element for every reply. Phones only let a page play sound after a tap, and iPhones
// remember that per element: so the Start tap plays a moment of silence on this element, and
// every reply after it plays on the same one.

// 50 ms of silence, small enough to inline.
const SILENCE =
  "data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA";

export type Player = {
  /** Call inside a tap, before any await. */
  unlock(): void;
  play(url: string): void;
  stop(): void;
};

export function createPlayer(): Player {
  const audio = new Audio();
  audio.preload = "auto";
  return {
    unlock() {
      audio.src = SILENCE;
      // A refused play only means sound stays off; the reply is still on screen as text.
      audio.play().catch(() => undefined);
    },
    play(url) {
      audio.pause();
      audio.src = url;
      audio.play().catch(() => undefined);
    },
    stop() {
      audio.pause();
    },
  };
}
