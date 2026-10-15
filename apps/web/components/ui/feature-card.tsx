import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Banner, type BannerName } from "@/components/ui/art";
import { cn } from "@/lib/cn";

// Each banner sits on a panel of its own darkest colour, so picture and panel read as one piece.
const panels: Record<BannerName, string> = {
  voice: "bg-panel-voice",
  approve: "bg-panel-approve",
  bill: "bg-panel-bill",
  night: "bg-panel-night",
};

/** A screen's hero: a banner flush on a coloured panel, with white words under it. */
export function FeatureCard({
  banner,
  title,
  text,
  action,
  href,
  children,
  className,
}: {
  banner: BannerName;
  title: string;
  text?: ReactNode;
  /** The link's words, shown with an arrow when the card has an `href`. */
  action?: string;
  href?: string;
  /** Extra content on the panel, such as a button. */
  children?: ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="h-40">
        <Banner name={banner} flush />
      </div>
      <div className={cn("px-4 pt-4 pb-5 text-accent-ink", panels[banner])}>
        <p className="text-xl font-extrabold tracking-tight">{title}</p>
        {text && <div className="mt-1 text-base text-accent-ink/85">{text}</div>}
        {children}
        {action && (
          <p className="mt-3 flex items-center gap-1.5 text-base font-semibold">
            {action}
            <ArrowRight aria-hidden className="size-5" />
          </p>
        )}
      </div>
    </>
  );
  const shell = cn("block overflow-hidden rounded-3xl", className);
  if (href) {
    return (
      <Link href={href} className={cn(shell, "transition-transform active:scale-98")}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
