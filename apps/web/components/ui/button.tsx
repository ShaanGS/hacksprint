import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "soft" | "white" | "ghost" | "danger" | "lime" | "night";

// One primary button per screen: a full-width 56px pill whose label names the choice. Teal on the
// light screens; lime for anything an agent does and on the dark voice layer.
const base =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-transform active:scale-98 disabled:opacity-40 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink",
  soft: "bg-surface-muted text-ink",
  white: "bg-surface text-ink shadow-card",
  ghost: "text-ink",
  danger: "bg-danger text-accent-ink",
  lime: "bg-lime text-lime-ink",
  night: "bg-night-raised text-night-ink",
};

type ButtonProps = { variant?: ButtonVariant; wide?: boolean };

export function Button({
  variant = "primary",
  wide,
  className,
  ...props
}: ComponentProps<"button"> & ButtonProps) {
  return (
    <button
      type="button"
      className={cn(base, variants[variant], wide && "w-full", className)}
      {...props}
    />
  );
}

export function LinkButton({
  variant = "primary",
  wide,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonProps) {
  return <Link className={cn(base, variants[variant], wide && "w-full", className)} {...props} />;
}
