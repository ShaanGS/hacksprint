import { SendHorizontal } from "lucide-react";
import { Art } from "@/components/ui/art";
import { ArtStack } from "@/components/ui/art-stack";
import type { Lang } from "@/lib/i18n/languages";
import { textFor } from "@/lib/i18n/text";

/**
 * Before the customer says anything: the shop's greeting as the screen's hero, and an example
 * order they can tap to send, which is the fastest way to see the whole flow.
 */
export function TalkHero({
  lang,
  greeting,
  onTry,
}: {
  lang: Lang;
  greeting: string;
  onTry: (text: string) => void;
}) {
  const t = textFor(lang);
  return (
    <section lang={lang} className="rounded-3xl bg-tint-sky px-5 pt-4 pb-5">
      <div className="flex justify-center">
        <Art name="mic" size={136} eager />
      </div>
      <p className="mt-1 text-2xl leading-tight font-extrabold tracking-tight">{greeting}</p>
      <p className="mt-5 text-sm font-semibold text-ink-muted">{t.tryLabel}</p>
      <button
        type="button"
        onClick={() => onTry(t.exampleOrder)}
        className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-surface p-3 text-left shadow-float transition-transform active:scale-98"
      >
        <ArtStack names={["noodles", "butter", "sugar"]} size={40} />
        <span className="min-w-0 flex-1 text-base font-medium">{t.exampleOrder}</span>
        <SendHorizontal aria-hidden className="size-5 shrink-0" />
      </button>
    </section>
  );
}
