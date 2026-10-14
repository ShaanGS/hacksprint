import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/cn";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";
import type { VoiceTurn } from "@/lib/voice/turns";

/**
 * The conversation as bubbles: the shop on the left, the customer on the right. Every spoken
 * line shows as text. Choices under the shop's latest question can be tapped instead of said.
 */
export function Conversation({
  turns,
  lang,
  thinking,
  choicesOpen,
  onChoose,
  onDismissChoices,
}: {
  turns: VoiceTurn[];
  lang: Lang;
  thinking: boolean;
  choicesOpen: boolean;
  onChoose: (turnId: number, index: number) => void;
  onDismissChoices: () => void;
}) {
  const t = textFor(lang);
  const last = turns.at(-1);
  const choices = choicesOpen && last?.role === "shop" ? last.choices : [];
  return (
    <ol className="flex flex-col gap-3" aria-live="polite">
      {turns.map((turn) => (
        <li
          key={turn.id}
          lang={lang}
          className={cn(
            "rounded-2xl px-4 py-3 text-lg",
            turn.role === "shop"
              ? "mr-12 self-start bg-surface-muted"
              : "ml-12 self-end bg-accent text-accent-ink",
          )}
        >
          {turn.text}
        </li>
      ))}
      {thinking && (
        <li lang={lang} className="mr-12 self-start rounded-2xl px-4 py-3 text-lg text-ink-muted">
          {t.thinking}
        </li>
      )}
      {last && choices.length > 0 && (
        <li className="flex flex-wrap gap-2">
          {choices.map((choice, index) => (
            <Chip key={choice.code} on={false} onClick={() => onChoose(last.id, index)}>
              {choice.label}
            </Chip>
          ))}
          <Chip lang={lang} on={false} onClick={onDismissChoices}>
            {t.noThanks}
          </Chip>
        </li>
      )}
    </ol>
  );
}
