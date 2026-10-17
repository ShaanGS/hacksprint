import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tints = {
  sand: "from-tint-sand",
  mint: "from-tint-mint",
  sky: "from-tint-sky",
  lilac: "from-tint-lilac",
} as const;

export type PromoTint = keyof typeof tints;

/**
 * A pastel card with a product photo or an icon on the right and a pill to act, like a shop's
 * promo banner (reference 1). At most one per screen.
 */
export function PromoCard({
  tint = "mint",
  visual,
  title,
  text,
  action,
  href,
  onClick,
  children,
  className,
}: {
  tint?: PromoTint;
  /** A product photo or an icon, on the right. */
  visual: ReactNode;
  title: string;
  text?: ReactNode;
  /** The pill's words, when the whole card is a link or a button. */
  action?: string;
  href?: string;
  onClick?: () => void;
  /** Extra content inside the card, such as its own buttons. */
  children?: ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <span className="absolute right-4 bottom-4">{visual}</span>
      <div className="relative pr-28">
        <p className="text-xl leading-tight font-bold tracking-tight">{title}</p>
        {text && <div className="mt-1.5 text-sm text-ink-muted">{text}</div>}
        {action && (
          <span className="mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-accent-ink">
            {action}
            <ArrowRight aria-hidden className="size-4" />
          </span>
        )}
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </>
  );
  const shell = cn(
    "relative block overflow-hidden rounded-3xl bg-linear-to-br to-surface p-5 text-left shadow-card",
    tints[tint],
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cn(shell, "transition-transform active:scale-98")}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(shell, "w-full transition-transform active:scale-98")}
      >
        {body}
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
}

/** A screen's big number on black. One per screen. */
export function HeroCard({
  visual,
  className,
  children,
}: {
  visual?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl bg-accent p-5 text-accent-ink shadow-card",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute -top-20 -right-16 size-56 rounded-full bg-accent-ink/6"
      />
      <span
        aria-hidden
        className="absolute -right-6 -bottom-24 size-44 rounded-full bg-accent-ink/5"
      />
      {visual && <span className="absolute top-4 right-4">{visual}</span>}
      <div className="relative">{children}</div>
    </section>
  );
}
