import { useRef, useState } from "react";
import type { MicState } from "@/components/ui/hold-mic";
import type { Recorder } from "@/lib/audio/recorder";
import type { VoiceDecision } from "@/lib/owner/backend";
import type { OwnerOrder } from "@/lib/owner/types";

// Shorter than this is a tap, not a word: the owner is shown how to use the mic instead.
const MIN_HOLD_MS = 400;

/**
 * Hold the mic on an order and say "seri" (spec A6). The press can end before the microphone is
 * ready, and touch screens can send two releases; both are ignored.
 */
export function useHoldToDecide(handlers: {
  askMicrophone: () => Promise<Recorder | null>;
  decide: (order: OwnerOrder, audio: Blob) => Promise<VoiceDecision | null>;
  onTooShort: () => void;
  onMicBlocked: () => void;
  onResult: (result: VoiceDecision) => void;
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

  async function holdEnded(order: OwnerOrder) {
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
    const result = await handlers.decide(order, audio);
    setMic("idle");
    if (result) handlers.onResult(result);
  }

  return { mic, holdStarted, holdEnded };
}
