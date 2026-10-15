import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "soft" | "ghost" | "danger";

// One primary button per screen: full width, 56px, black, and its label names the choice.
const base =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-transform active:scale-98 disabled:opacity-40 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink",
  soft: "bg-surface-muted text-ink",
  ghost: "text-ink",
  danger: "bg-danger text-accent-ink",
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
