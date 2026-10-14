"use client";

import { ChevronUp, Keyboard, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CartSheet } from "@/components/customer/cart-sheet";
import { Conversation } from "@/components/customer/conversation";
import { MicButton, type MicState } from "@/components/ui/mic-button";
import { Ticker } from "@/components/ui/ticker";
import type { CustomerBackend, TurnResult } from "@/lib/customer/backend";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import type { Cart } from "@/lib/orders/cart";
import type { PaymentMode } from "@/lib/orders/submit";
import type { VoiceTurn } from "@/lib/voice/turns";

// A press shorter than this is a tap, not speech: the customer is told to hold while speaking.
const MIN_HOLD_MS = 300;

/** C1: the voice order. Hold to talk, or type; the cart pill opens the cart and review. */
export function Talk({
  lang,
  shopName,
  backend,
  onSent,
}: {
  lang: Lang;
  shopName: string;
  backend: CustomerBackend;
  onSent: (number: number) => void;
}) {
  const t = textFor(lang);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [cart, setCart] = useState<Cart>({ lines: [], totalPaise: 0 });
  const [mic, setMic] = useState<MicState>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [choicesOpen, setChoicesOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [readBack, setReadBack] = useState<string | null>(null);
  const holdStart = useRef(0);
  // A ref, not state: two release events can arrive before React re-renders.
  const holding = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Development renders effects twice; only the latest answer counts.
    let current = true;
    backend.start().then(
      (result) => {
        if (!current) return;
        setTurns(result.turns);
        setCart(result.cart);
      },
      () => {
        if (current) setHint(textFor(lang).fallback);
      },
    );
    return () => {
      current = false;
    };
  }, [backend, lang]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, mic]);

  function apply(result: TurnResult) {
    setTurns((current) => [...current, ...result.turns]);
    setCart(result.cart);
    setChoicesOpen(true);
    if (result.review) {
      setReadBack(result.turns.at(-1)?.text ?? null);
      setSheetOpen(true);
    }
  }

  async function run(work: () => Promise<TurnResult>) {
    setMic("thinking");
    setHint(null);
    try {
      apply(await work());
    } catch {
      setHint(t.fallback);
    } finally {
      setMic("idle");
    }
  }

  function holdStarted() {
    holding.current = true;
    holdStart.current = Date.now();
    setHint(null);
    setMic("listening");
  }

  function holdEnded() {
    if (!holding.current) return;
    holding.current = false;
    if (Date.now() - holdStart.current < MIN_HOLD_MS) {
      setMic("idle");
      setHint(t.holdLonger);
      return;
    }
    run(async () => {
      const heard = await backend.transcribe(null);
      if (!heard) return { turns: [], cart, review: false };
      return backend.say(heard, "voice");
    });
  }

  function sendTyped() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    run(() => backend.say(text, "typed"));
  }

  async function changeQuantity(code: string, qty: number) {
    setReadBack(null);
    setCart(await backend.setQuantity(code, qty));
  }

  async function send(mode: PaymentMode) {
    const { number } = await backend.send(mode);
    setSheetOpen(false);
    onSent(number);
  }

  const count = cart.lines.length;
  return (
    <main lang={lang} className="flex h-full flex-col">
      <header className="px-4 pt-8 pb-3">
        <h1 className="text-title font-bold">{shopName}</h1>
        <p className="mt-1 text-base text-ink-muted">{t.trySaying}</p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
        <Conversation
          turns={turns}
          lang={lang}
          thinking={mic === "thinking"}
          choicesOpen={choicesOpen}
          onChoose={(turnId, index) => {
            setChoicesOpen(false);
            run(() => backend.choose(turnId, index));
          }}
          onDismissChoices={() => setChoicesOpen(false)}
        />
        <div ref={bottom} />
      </div>

      <footer className="border-t border-border px-4 pt-3 pb-6">
        {count > 0 && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex min-h-14 w-full items-center justify-between rounded-xl bg-surface-muted px-4"
          >
            <span className="flex items-center gap-2 text-base font-medium">
              <ChevronUp aria-hidden className="size-5" />
              {t.items(count)}
            </span>
            <Ticker paise={cart.totalPaise} className="text-lg font-bold" />
          </button>
        )}

        {typing ? (
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              sendTyped();
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t.typeHere}
              aria-label={t.typeHere}
              className="min-h-14 flex-1 rounded-lg bg-surface-muted px-4 text-lg outline-none focus:outline-2 focus:outline-ink"
            />
            <button
              type="submit"
              aria-label={t.sendText}
              disabled={!draft.trim() || mic === "thinking"}
              className="grid size-14 place-items-center rounded-xl bg-accent text-accent-ink disabled:opacity-40"
            >
              <SendHorizontal aria-hidden className="size-6" />
            </button>
          </form>
        ) : (
          <div className="mt-4">
            <MicButton
              state={mic}
              onHoldStart={holdStarted}
              onHoldEnd={holdEnded}
              labels={{ idle: t.holdToTalk, listening: t.listening, thinking: t.thinking }}
            />
          </div>
        )}
        {hint && (
          <p role="status" className="mt-2 text-center text-sm font-medium text-danger">
            {hint}
          </p>
        )}
        <button
          type="button"
          onClick={() => setTyping((on) => !on)}
          className="mx-auto mt-2 flex min-h-11 items-center gap-2 px-3 text-base font-medium text-ink-muted"
        >
          <Keyboard aria-hidden className="size-5" />
          {typing ? t.holdToTalk : t.typeInstead}
        </button>
      </footer>

      <CartSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        lang={lang}
        shopName={shopName}
        cart={cart}
        readBack={readBack}
        onQuantity={changeQuantity}
        onSend={send}
      />
    </main>
  );
}
