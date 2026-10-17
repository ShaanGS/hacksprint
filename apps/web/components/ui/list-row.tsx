import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ListRowProps = {
  /** Usually <ArtCircle> or a <Monogram>. */
  art?: ReactNode;
  /** At most one small tag above the title. */
  tag?: ReactNode;
  title: ReactNode;
  /** One grey meta line: "1 kg · ₹46 a kg". */
  meta?: ReactNode;
  /** One short fact: "Out of stock today". */
  note?: ReactNode;
  /** Usually an <Amount>, on the title's baseline. */
  trailing?: ReactNode;
  /** The chosen row gets a 2px teal outline. */
  selected?: boolean;
  href?: string;
  onClick?: () => void;
  /** Light on the owner's screens; night on the voice and agent layer. */
  tone?: keyof typeof tones;
};

const tones = {
  light: { muted: "text-ink-muted", press: "active:bg-surface-muted", chosen: "outline-accent" },
  night: { muted: "text-night-muted", press: "active:bg-night-raised", chosen: "outline-yellow" },
} as const;

/** One flat row in a list: art on the left, words in the middle, the amount on the right. */
export function ListRow({
  art,
  tag,
  title,
  meta,
  note,
  trailing,
  selected,
  href,
  onClick,
  tone = "light",
}: ListRowProps) {
  const look = tones[tone];
  const body = (
    <>
      {art}
      <span className="min-w-0 flex-1 text-left">
        {tag && <span className="mb-1 block">{tag}</span>}
        <span className="line-clamp-2 text-base leading-snug font-semibold">{title}</span>
        {meta && <span className={cn("mt-0.5 block text-sm", look.muted)}>{meta}</span>}
        {note && <span className={cn("mt-1 block text-sm", look.muted)}>{note}</span>}
      </span>
      {trailing && <span className="shrink-0 self-start pt-1 text-right">{trailing}</span>}
    </>
  );
  const className = cn(
    "flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors",
    (href || onClick) && look.press,
    selected && cn("outline-2", look.chosen),
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
