"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/cn";

const tones = {
  light: {
    content: "bg-surface text-ink",
    grabber: "bg-surface-pressed",
    line: "border-border",
    muted: "text-ink-muted",
    footer: "bg-surface",
  },
  night: {
    content: "bg-night text-night-ink",
    grabber: "bg-night-raised",
    line: "border-night-raised",
    muted: "text-night-muted",
    footer: "bg-night",
  },
} as const;

/**
 * A sheet that slides up from the bottom of the phone screen and can be dragged down to close.
 * It attaches to #screen (see AppFrame), so on a laptop it stays inside the phone frame. The
 * footer stays pinned while the content scrolls, so the sheet's one button is always in reach.
 * Voice and the agents open on the dark "night" tone.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  tone = "light",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  tone?: keyof typeof tones;
  children: ReactNode;
}) {
  const look = tones[tone];
  const container = typeof document === "undefined" ? undefined : document.getElementById("screen");
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} container={container}>
      <Drawer.Portal>
        <Drawer.Overlay className="absolute inset-0 z-40 bg-ink/45" />
        <Drawer.Content
          className={cn(
            "absolute inset-x-0 bottom-0 z-50 flex max-h-11/12 flex-col rounded-t-3xl shadow-sheet outline-none",
            look.content,
          )}
        >
          <div
            aria-hidden
            className={cn("mx-auto mt-3 h-1 w-10 shrink-0 rounded-full", look.grabber)}
          />
          <Drawer.Title
            className={cn(
              "mx-4 shrink-0 border-b pt-3 pb-3 text-center text-xl font-bold tracking-tight",
              look.line,
            )}
          >
            {title}
          </Drawer.Title>
          <Drawer.Description
            className={description ? cn("mx-4 mt-3 text-center text-sm", look.muted) : "sr-only"}
          >
            {description ?? title}
          </Drawer.Description>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-6">{children}</div>
          {footer && (
            <div className={cn("pb-safe shrink-0 border-t px-4 pt-3", look.line, look.footer)}>
              {footer}
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
