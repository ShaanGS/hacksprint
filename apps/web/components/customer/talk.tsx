"use client";

import { Keyboard, Mic, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CartDock } from "@/components/customer/cart-dock";
import { CartSheet } from "@/components/customer/cart-sheet";
import { Conversation } from "@/components/customer/conversation";
import { TalkHero } from "@/components/customer/talk-hero";
import { useConversation, type Voice } from "@/components/customer/use-conversation";
import { Art } from "@/components/ui/art";
import { MicButton } from "@/components/ui/mic-button";
import type { CustomerBackend } from "@/lib/customer/backend";
import { langInfo, type Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";

/** C1: the voice order. Hold to talk, or type; the cart dock opens the cart and review. */
export function Talk({
  lang,
  shopName,
  backend,
  voice,
  onSent,
}: {
  lang: Lang;
  shopName: string;
  backend: CustomerBackend;
  voice: Voice;
  onSent: (number: number) => void;
}) {
  const t = textFor(lang);
  const convo = useConversation({ lang, backend, voice, onSent });
  const { turns, cart, mic, hint, heard } = convo;
  // Without a microphone (refused, or none) the order is typed.
  const [typing, setTyping] = useState(voice.recorder === null && voice.player !== null);
  const [draft, setDraft] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, mic, heard]);

  const started = turns.some((turn) => turn.role === "customer");
  const greeting = turns.find((turn) => turn.role === "shop")?.text ?? "";
  return (
    <main lang={lang} className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 px-4 pt-4 pb-3">
        <Art name="shop" size={44} />
        <div className="min-w-0">
          <h1 className="truncate text-lg leading-tight font-extrabold tracking-tight">
            {shopName}
          </h1>
          <p className="text-sm text-ink-muted">{langInfo[lang].name}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
        {started || heard !== null || !greeting ? (
          <Conversation
            turns={turns}
            lang={lang}
            heard={heard}
            thinking={mic === "thinking"}
            choicesOpen={convo.choicesOpen}
            onChoose={convo.choose}
            onDismissChoices={convo.dismissChoices}
            onReplay={convo.replay}
          />
        ) : (
          <TalkHero lang={lang} greeting={greeting} onTry={convo.say} />
        )}
        <div ref={bottom} />
      </div>

      <footer className="pb-safe shrink-0 px-4 pt-2">
        {cart.lines.length > 0 && (
          <CartDock cart={cart} lang={lang} onOpen={() => convo.setSheetOpen(true)} />
        )}
        {typing ? (
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              convo.say(draft);
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t.typeHere}
              aria-label={t.typeHere}
              className="min-h-14 flex-1 rounded-lg bg-surface-muted px-4 text-lg outline-none placeholder:text-ink-faint focus:outline-2 focus:outline-ink"
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
          <div className="mt-3">
            <MicButton
              state={mic}
              onHoldStart={convo.holdStarted}
              onHoldEnd={convo.holdEnded}
              labels={{ idle: t.holdToTalk, listening: t.listening, thinking: t.thinking }}
            />
          </div>
        )}
        {hint && (
          <p role="status" className="mt-1 text-center text-sm font-medium text-danger">
            {hint}
          </p>
        )}
        <button
          type="button"
          onClick={() => setTyping((on) => !on)}
          className="mx-auto mt-1 flex min-h-11 items-center gap-2 px-3 text-base font-medium text-ink-muted"
        >
          {typing ? (
            <Mic aria-hidden className="size-5" />
          ) : (
            <Keyboard aria-hidden className="size-5" />
          )}
          {typing ? t.holdToTalk : t.typeInstead}
        </button>
      </footer>

      <CartSheet
        open={convo.sheetOpen}
        onOpenChange={convo.setSheetOpen}
        lang={lang}
        shopName={shopName}
        cart={cart}
        readBack={convo.readBack}
        onQuantity={convo.changeQuantity}
        onSend={convo.send}
        onSources={backend.priceSources}
      />
    </main>
  );
}
