"use client";

import { useEffect, useRef, useState } from "react";
import type { MicState } from "@/components/ui/mic-button";
import type { CustomerBackend, TurnResult } from "@/lib/customer/backend";
import type { Player } from "@/lib/customer/player";
import type { Recorder } from "@/lib/customer/recorder";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import type { Cart } from "@/lib/orders/cart";
import type { PaymentMode } from "@/lib/orders/submit";
import type { VoiceTurn } from "@/lib/voice/turns";

// A press shorter than this is a tap, not speech: the customer is told to hold while speaking.
const MIN_HOLD_MS = 300;

/** The microphone and speaker for a live order; both are null in the preview or when refused. */
export type Voice = { recorder: Recorder | null; player: Player | null };

/** Everything the voice order screen does: turns, cart, mic, sound and the review sheet. */
export function useConversation({
  lang,
  backend,
  voice,
  onSent,
}: {
  lang: Lang;
  backend: CustomerBackend;
  voice: Voice;
  onSent: (number: number) => void;
}) {
  const t = textFor(lang);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [cart, setCart] = useState<Cart>({ lines: [], totalPaise: 0 });
  const [mic, setMic] = useState<MicState>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const [choicesOpen, setChoicesOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [readBack, setReadBack] = useState<string | null>(null);
  const holdStart = useRef(0);
  // A ref, not state: two release events can arrive before React re-renders.
  const holding = useRef(false);

  function speakLatest(newTurns: VoiceTurn[]) {
    const reply = newTurns.findLast((turn) => turn.role === "shop");
    const url = reply && backend.audioUrl(reply.id);
    if (url) voice.player?.play(url);
  }

  useEffect(() => {
    // Development renders effects twice; only the latest answer counts.
    let current = true;
    backend.start().then(
      (result) => {
        if (!current) return;
        setTurns(result.turns);
        setCart(result.cart);
        if (result.turns.length === 1) speakLatest(result.turns);
      },
      () => {
        if (current) setHint(textFor(lang).fallback);
      },
    );
    return () => {
      current = false;
    };
    // The greeting plays once per backend; speakLatest only reads the current voice and backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backend, lang]);

  function apply(result: TurnResult) {
    setTurns((current) => [...current, ...result.turns]);
    setCart(result.cart);
    setChoicesOpen(true);
    speakLatest(result.turns);
    if (result.sent !== undefined) {
      onSent(result.sent);
      return;
    }
    if (result.review) {
      setReadBack(result.turns.at(-1)?.text ?? null);
      setSheetOpen(true);
    }
  }

  async function run(work: () => Promise<TurnResult | null>) {
    setMic("thinking");
    setHint(null);
    try {
      const result = await work();
      if (result) apply(result);
      else setHint(t.didntCatch);
    } catch {
      setHint(t.fallback);
    } finally {
      setHeard(null);
      setMic("idle");
    }
  }

  function holdStarted() {
    holding.current = true;
    holdStart.current = Date.now();
    setHint(null);
    voice.player?.stop();
    voice.recorder?.start();
    setMic("listening");
  }

  async function holdEnded() {
    if (!holding.current) return;
    holding.current = false;
    const tooShort = Date.now() - holdStart.current < MIN_HOLD_MS;
    const audio = (await voice.recorder?.stop()) ?? null;
    if (tooShort) {
      setMic("idle");
      setHint(t.holdLonger);
      return;
    }
    run(() => backend.speak(audio, setHeard));
  }

  return {
    turns,
    cart,
    mic,
    hint,
    heard,
    choicesOpen,
    sheetOpen,
    readBack,
    setSheetOpen,
    holdStarted,
    holdEnded,
    say(text: string) {
      const clean = text.trim();
      if (!clean || mic === "thinking") return;
      run(() => backend.say(clean));
    },
    choose(turnId: number, index: number) {
      setChoicesOpen(false);
      run(() => backend.choose(turnId, index));
    },
    dismissChoices() {
      setChoicesOpen(false);
    },
    replay(turnId: number) {
      const url = backend.audioUrl(turnId);
      if (url) voice.player?.play(url);
    },
    async changeQuantity(code: string, qty: number) {
      setReadBack(null);
      setCart(await backend.setQuantity(code, qty));
    },
    async send(mode: PaymentMode) {
      const { number } = await backend.send(mode);
      setSheetOpen(false);
      onSent(number);
    },
  };
}
