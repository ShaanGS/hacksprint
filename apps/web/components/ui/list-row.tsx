import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ListRowProps = {
  /** Usually <Art>, 64px, straight on the surface with nothing behind it. */
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
  /** The chosen row gets a 2px black outline. */
  selected?: boolean;
  href?: string;
  onClick?: () => void;
};

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
}: ListRowProps) {
  const body = (
    <>
      {art}
      <span className="min-w-0 flex-1 text-left">
        {tag && <span className="mb-1 block">{tag}</span>}
        <span className="line-clamp-2 text-lg font-medium">{title}</span>
        {meta && <span className="line-clamp-2 text-base text-ink-muted">{meta}</span>}
        {note && <span className="block text-sm text-ink-muted">{note}</span>}
      </span>
      {trailing && <span className="shrink-0 self-start pt-1 text-right">{trailing}</span>}
    </>
  );
  const className = cn(
    "flex min-h-16 w-full items-center gap-3 rounded-2xl px-3 py-3",
    selected && "outline-2 outline-ink",
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
