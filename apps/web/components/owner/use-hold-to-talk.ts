import { useRef, useState } from "react";
import type { MicState } from "@/components/ui/hold-mic";
import type { Recorder } from "@/lib/audio/recorder";

// Shorter than this is a tap, not a word: the owner is shown how to use the mic instead.
const MIN_HOLD_MS = 400;

/**
 * Hold the mic, speak, let go: the recording goes to whatever the release asks for, such as a
 * voice entry (spec B1) or an order decision (frozen). The press can end before the microphone is
 * ready, and touch screens can send two releases; both are ignored.
 */
export function useHoldToTalk(handlers: {
  askMicrophone: () => Promise<Recorder | null>;
  onTooShort: () => void;
  onMicBlocked: () => void;
}) {
  const [mic, setMic] = useState<MicState>("idle");
  const pressedAt = useRef<number | null>(null);
  const recording = useRef<Recorder | null>(null);

  async function holdStarted() {
    if (mic !== "idle" || pressedAt.current !== null) return;
    pressedAt.current = Date.now();
    const recorder = await handlers.askMicrophone();
    if (!recorder) {
      pressedAt.current = null;
      handlers.onMicBlocked();
      return;
    }
    if (pressedAt.current === null) return;
    recorder.start();
    recording.current = recorder;
    setMic("listening");
  }

  async function holdEnded(handle: (audio: Blob) => Promise<void>) {
    const startedAt = pressedAt.current;
    pressedAt.current = null;
    const recorder = recording.current;
    recording.current = null;
    if (startedAt === null || !recorder) return;
    const heldMs = Date.now() - startedAt;
    setMic("thinking");
    const audio = await recorder.stop();
    if (!audio || heldMs < MIN_HOLD_MS) {
      setMic("idle");
      handlers.onTooShort();
      return;
    }
    await handle(audio);
    setMic("idle");
  }

  return { mic, holdStarted, holdEnded };
}
