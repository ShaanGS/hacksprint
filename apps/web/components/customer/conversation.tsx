"use client";

import { Plus, Volume2 } from "lucide-react";
import { motion } from "motion/react";
import { Amount } from "@/components/ui/amount";
import { Art, toArtName } from "@/components/ui/art";
import { Badge } from "@/components/ui/badge";
import { ItemCard } from "@/components/ui/item-card";
import { Typing } from "@/components/ui/typing";
import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/i18n/languages";
import { quantityPhrase } from "@/lib/i18n/speech";
import { textFor } from "@/lib/i18n/text";
import { rise } from "@/lib/motion";
import type { Choice, TurnItem, VoiceTurn } from "@/lib/voice/turns";

/**
 * The conversation: the shop on the left with its picture, the customer on the right. Every
 * spoken line shows as text, and the products the shop handled show as cards under its reply.
 */
export function Conversation({
  turns,
  lang,
  heard,
  thinking,
  choicesOpen,
  onChoose,
  onDismissChoices,
  onReplay,
}: {
  turns: VoiceTurn[];
  lang: Lang;
  /** What the customer just said, shown before the shop has answered. */
  heard: string | null;
  thinking: boolean;
  choicesOpen: boolean;
  onChoose: (turnId: number, index: number) => void;
  onDismissChoices: () => void;
  /** Plays a shop reply again. */
  onReplay: (turnId: number) => void;
}) {
  const t = textFor(lang);
  const last = turns.at(-1);
  return (
    <ol lang={lang} className="flex flex-col gap-3" aria-live="polite">
      {turns.map((turn) => (
        <motion.li key={turn.id} {...rise} className="flex flex-col gap-2">
          {turn.role === "customer" ? (
            <CustomerLine text={turn.text} />
          ) : (
            <ShopLine text={turn.text} onReplay={() => onReplay(turn.id)} />
          )}
          {turn.items.length > 0 && (
            <div className="ml-10 flex flex-col gap-2">
              {turn.items.map((item) => (
                <Item key={item.code} item={item} lang={lang} />
              ))}
            </div>
          )}
          {turn === last && turn.role === "shop" && choicesOpen && turn.choices.length > 0 && (
            <div className="ml-10 flex flex-col gap-2">
              {turn.choices.map((choice, index) => (
                <Suggestion
                  key={choice.code}
                  choice={choice}
                  lang={lang}
                  onUse={() => onChoose(turn.id, index)}
                />
              ))}
              <button
                type="button"
                onClick={onDismissChoices}
                className="min-h-11 self-start px-1 text-base font-medium text-ink-muted"
              >
                {t.noThanks}
              </button>
            </div>
          )}
        </motion.li>
      ))}
      {heard && (
        <motion.li {...rise} className="flex flex-col">
          <CustomerLine text={heard} />
        </motion.li>
      )}
      {thinking && (
        <motion.li {...rise} className="flex items-end gap-2">
          <Art name="shop" size={32} />
          <span className="rounded-2xl rounded-bl-lg bg-surface-muted px-4 py-3">
            <Typing label={t.thinking} />
          </span>
        </motion.li>
      )}
    </ol>
  );
}

function CustomerLine({ text }: { text: string }) {
  return (
    <p className="ml-12 self-end rounded-2xl rounded-br-lg bg-accent px-4 py-3 text-lg text-accent-ink">
      {text}
    </p>
  );
}

/** A shop reply; tapping it plays it again, for a customer who missed what was said. */
function ShopLine({ text, onReplay }: { text: string; onReplay: () => void }) {
  return (
    <div className="mr-8 flex items-end gap-2">
      <Art name="shop" size={32} />
      <button
        type="button"
        onClick={onReplay}
        className="flex items-start gap-2 rounded-2xl rounded-bl-lg bg-surface-muted px-4 py-3 text-left text-lg active:scale-98"
      >
        <span>{text}</span>
        <Volume2 aria-hidden className="mt-1 size-4 shrink-0 text-ink-faint" />
      </button>
    </div>
  );
}

function Item({ item, lang }: { item: TurnItem; lang: Lang }) {
  const t = textFor(lang);
  const out = item.state === "out_of_stock";
  return (
    <ItemCard
      art={toArtName(item.art)}
      name={item.name}
      meta={amountOf(item.qty, item.unit, lang)}
      out={out}
      tag={out ? <Badge tone="danger">{t.outOfStock}</Badge> : <Badge>{t.addedTag}</Badge>}
    />
  );
}

function Suggestion({ choice, lang, onUse }: { choice: Choice; lang: Lang; onUse: () => void }) {
  const t = textFor(lang);
  return (
    <ItemCard
      suggested
      art={toArtName(choice.art)}
      name={choice.label}
      meta={
        <>
          {amountOf(choice.qty, choice.unit, lang)} · <Amount paise={choice.linePaise} size="sm" />
        </>
      }
      action={
        <button
          type="button"
          onClick={onUse}
          className={cn(
            "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink",
            "transition-transform active:scale-95",
          )}
        >
          <Plus aria-hidden className="size-4" />
          {t.useInstead(choice.label)}
        </button>
      }
    />
  );
}

/** "அரை கிலோ" for loose goods, "× 2" for packs and pieces, so no unit word needs translating. */
function amountOf(qty: number, unit: TurnItem["unit"], lang: Lang): string {
  return unit === "kg" || unit === "litre" ? quantityPhrase(qty, unit, lang) : `× ${qty}`;
}
